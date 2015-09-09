
const SEND = require("send");


exports.app = function (options) {

    return function (req, res, next) {
        var uri = req.params[0];
        var paths = Object.keys(options.paths).map(function (alias) {
            return options.paths[alias]
        });
        function tryNextPath () {
            return SEND(req, uri, {
        		root: paths.shift()
        	}).on("error", function (err) {
                if (paths.length === 0) {
                    return next(err);
                }
        	    return tryNextPath();
        	}).pipe(res);
        }
        return tryNextPath();
    }
}
