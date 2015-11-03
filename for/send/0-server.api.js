
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

                    const REWORK = require("rework");
                    const REWORK_PLUGIN_URL = require("rework-plugin-url");

                    var sourcePath = LIB.path.join(basePath, uri);
                    
                    return LIB.fs.readFile(sourcePath, "utf8", function (err, data) {
                        if (err) return next(err);

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
        				
        				res.writeHead(200, {
        				    "Content-Type": "text/css"
        				});
        				res.end(output.toString());
        				return;
                    });
                }


                return LIB.send(req, uri, {
            		root: basePath
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
