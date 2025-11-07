/* global module, require */

module.exports = function (grunt) {
    "use strict";

    var srcUIDir = "./src_ui";
    var ui5Version = "1.52";
    var destUIDir = "../../resources/mri-ui5/mri-pa-ui"
    grunt.initConfig({
        less: {
            style: {
                options: {
                    compress: true
                },
                files: [{
                    expand: true,
                    cwd: `./${srcUIDir}/`,
                    src: [
                        "**/css/style.less"
                    ],
                    dest: `${destUIDir}/`,
                    ext: ".css"
                }]
            }
        },
        openui5_theme: {
            library: {
                options: {
                    compiler: {
                        compress: true
                    }
                },
                files: [
                    {
                        expand: true,
                        cwd: `${srcUIDir}/`,
                        src: [
                            "**/themes/**/library.source.less"
                        ],
                        dest: `${destUIDir}/`
                    }
                ]
            }
        },
        openui5_preload: {
            mri: {
                options: {
                    resources: {
                        cwd: `${srcUIDir}/mri`,
                        src: [
                            "./*.js",
                            "**/*.js",
                            "**/*.xml",
                            "**/*.html",
                            "**/*.json",
                            "!**/*-dbg*.js",
                            "!**/Component-preload.js",
                            "!**/vue/js/**/*.*",
                            "!**/vue/Component-preload.js"
                        ],
                        prefix: "hc/mri/pa/ui"
                    },
                    dest: `${destUIDir}/mri`,
                    // compatVersion: ui5Version,
                },
                components: true
            },
            allLibraries: {
                options: {
                    resources: {
                        cwd: `${srcUIDir}/`,
                        src: [
                            "**/*.js"
                        ]
                    },
                    dest: `${destUIDir}/`,
                },
                libraries: true
            }
        },
        clean: {
            all_css: [
                `${srcUIDir}/**/*.css`,
                "!**/vue/css/**/*.css",
                `!${srcUIDir}/ps/**/*.css`
            ],
            all_js_debug: {
                cwd: `${srcUIDir}`,
                src: "**/*-dbg*.*",
                expand: true
            },
            all_js_preload: {
                cwd: `${srcUIDir}`,
                src: [
                    "**/Component-preload.js",
                    "**/library-preload.json"
                ],
                expand: true
            },
            process: {
                cwd: "process",
                src: "**",
                expand: true
            },
        },
        copy: {
            originalsToProcess: {
                files: [{
                    expand: true,
                    cwd: `${srcUIDir}`,
                    src: [
                        "./mri/*.js",
                        "./mri/**/*.js",
                        "./mri_config/*.js",
                        "./mri_config/**/*.js",
                        "!**/*-dbg*.js",
                        "!**/Component-preload.js",
                        "!**/vue/**/*.*",
                        "!**/vue/Component-preload.js"
                    ],
                    dest: "process/",
                    rename: function (dest, src) {
                        var aSrc = src.split(".");
                        var ext = aSrc.pop();
                        return dest + (ext === "js" ? src.replace(/(\.controller)?\.js$/, "$1.js") : src);
                    }
                }]
            },
            processToOriginals: {
                files: [{
                    expand: true,
                    cwd: "process",
                    src: [
                        "**/*",
                        "**/.*"
                    ],
                    dest: `${destUIDir}`
                }]
            },
            copyToDestination: {
                files: [
                    {
                        expand: true,
                        cwd: `${srcUIDir}`,
                        src: ["**/*", "**/.*"],
                        dest: `${destUIDir}`,
                    },
                ],
            },
        }
    });

    grunt.loadNpmTasks("grunt-openui5");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-qunit-junit");
    grunt.loadNpmTasks("grunt-contrib-copy");

    //generate css
    grunt.registerTask("css", [
        "clean:all_css",
        "openui5_theme:library",
        "less:style"
    ]);

    // generate css, preload, and -dbg files
    grunt.registerTask("production", [
        "clean",
        "openui5_theme:library",
        "less:style",
        "openui5_preload:mri",
        "openui5_preload:allLibraries",
        "copy:originalsToProcess",
        "copy:processToOriginals",
        "clean:process",
        "copy:copyToDestination",
    ]);

    grunt.registerTask("clean_dev", [
        "clean:all_css",
        "clean:all_js_debug",
        "clean:all_js_preload"
    ]);

    grunt.registerTask("dbg", [
        "copy:originalsToProcess",
        "copy:processToOriginals"
    ]);
};