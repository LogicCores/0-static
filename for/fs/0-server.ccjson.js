
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                self.AspectInstance = function (aspectConfig) {

                    return LIB.Promise.resolve({
                        path: function () {

                            var config = {};
                            LIB._.merge(config, defaultConfig);
                            LIB._.merge(config, instanceConfig);
                            LIB._.merge(config, aspectConfig);

                            if (config.loaderPath || config.basePath) {
                                return LIB.Promise.resolve(
                                    LIB.path.join(
                                        config.loaderPath || config.basePath,
                                        config.namespace || ""
                                    )
                                );
                            }
                            return LIB.Promise.resolve(null);
                        },
                        paths: function () {

                            var config = {};
                            LIB._.merge(config, defaultConfig);
                            LIB._.merge(config, instanceConfig);
                            LIB._.merge(config, aspectConfig);
                            
                            if (config.sets) {
                                var sets = {};
                                Object.keys(config.sets).forEach(function (alias) {
                                    sets[alias] = LIB.path.join(
                                        config.sets[alias].loaderPath || config.sets[alias].basePath,
                                        config.namespace || ""
                                    )
                                });
                                return LIB.Promise.resolve(sets);
                            } else
                            if (config.loaderPath || config.basePath) {
                                return LIB.Promise.resolve({
                                    "": LIB.path.join(
                                        config.loaderPath || config.basePath,
                                        config.namespace || ""
                                    )
                                });
                            }
                            return LIB.Promise.resolve(null);
                        }
                    });
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
