
exports.forLib = function (LIB) {

    var exports = {};

    exports.app = function (options) {

        return function (req, res, next) {

            // TODO: Put this into a generic helper.
            var params = req.params;
            if (options.match) {
                // TODO: Relocate into generic helper.
                var expression = new RegExp(options.match.replace(/\//g, "\\/"));
                var m = expression.exec(req.params[0]);
                if (!m) return next();
                params = m.slice(1);
            }
            var uri = params[0];


            var allPaths = Object.keys(options.paths).map(function (alias) {
                return options.paths[alias]
            });
            var paths = [].concat(allPaths);
            function tryNextPath () {
                var basePath = paths.shift();


                // Rewrite CSS base paths if absolute and we are on a subUri.
                // TODO: Optionally make all URIs relative.
                // TODO: Put this into a transformer that gets declared in config.
                if (
                    options.subUri &&
                    /\.css$/.test(uri)
                ) {

                    var distPath = LIB.path.join(options.cachePath, uri);

                    function serveDistPath () {
                        return LIB.send(req, LIB.path.basename(distPath), {
                    		root: LIB.path.dirname(distPath),
                    		maxAge: options.clientCacheTTL || 0
                    	}).on("error", next).pipe(res);
                    }

                    return LIB.fs.existsAsync(distPath).then(function (exists) {

                        if (
                            exists &&
                            options.alwaysRebuild === false
                        ) {
                            if (LIB.VERBOSE) console.log("Using cached processed file for uri '" + uri + "' from cache '" + distPath + "'");
    
                            return serveDistPath();
                        }
    
                        const REWORK = require("rework");
                        const REWORK_PLUGIN_URL = require("rework-plugin-url");
    
                        var sourcePath = LIB.path.join(basePath, uri);
                        
                        return LIB.fs.readFileAsync(sourcePath, "utf8").then(function (data) {

            				var output = REWORK(data, {
            					source: sourcePath
            				})
            				.use(REWORK_PLUGIN_URL(function (url) {
                                // Rewrite all absolute urls by prepending the subUri.
            					if (/^\//.test(url)) {
            					    url = options.subUri + url;
            					}
            					return url;
            				}));

                            var css = output.toString();
    
        					function checkIfChanged () {
        						return LIB.fs.existsAsync(distPath).then(function (exists) {
        							if (!exists) return true;
        							return LIB.fs.readFileAsync(distPath, "utf8").then(function (existingData) {
        								if (existingData === css) {
        									return false;
        								}
        								return true;
        							});
        						});
        					}
        					
        					return checkIfChanged().then(function (changed) {
        						if (!changed) return null;

                                if (LIB.VERBOSE) console.log("Writing processed file for uri '" + uri + "' to cache '" + distPath + "'");
    
        				        return LIB.fs.outputFileAsync(distPath, css, "utf8");
        					}).then(function () {
        					    
        					    return serveDistPath();
        					});
                        });
                    }).catch(next);
                }


                return LIB.send(req, uri, {
            		root: basePath,
            		maxAge: options.clientCacheTTL
            	}).on("error", function (err) {
                    if (paths.length === 0) {
                        // We silence the error and continue.
                	    console.log("File '" + uri + "' not found in basePaths '" + allPaths.join("', '") + "'", new Error().stack);
                	    if (!req.flags) {
                	        req.flags = {};
                	    }
                	    // We tell the page resolver to 404 when no exact match found
                	    // TODO: Make this more generic.
                	    req.flags["export.sm.hoist.VisualComponents"] = {
                	        "404onRootPage": true
                	    };
                        return next();
                    }
            	    return tryNextPath();
            	}).pipe(res);
            }
            return tryNextPath();
        }
    }

    return exports;
}
