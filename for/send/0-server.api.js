
const SEND = require("send");


exports.app = function (options) {

    return function (req, res, next) {
        var uri = req.params[0];
        var allPaths = Object.keys(options.paths).map(function (alias) {
            return options.paths[alias]
        });
        var paths = [].concat(allPaths);
        function tryNextPath () {
            var basePath = paths.shift();
            return SEND(req, uri, {
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
