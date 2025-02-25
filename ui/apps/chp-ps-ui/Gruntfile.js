/* global module, require */

module.exports = function (grunt) {
    "use strict";
    const srcUIDir = "./src_ui/ps/app/ui";
    var destUIDir = "../../resources/mri-ui5/chp-ps-ui";
    var ui5Version = "1.52";

    grunt.initConfig({
        less: {
            style: {
                options: {
                    compress: true
                },
                files: [{
                    expand: true,
                    cwd: `./${srcUIDir}/content`,
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
            ps: {
                options: {
                    resources: {
                        cwd: `${srcUIDir}`,
                        src: [
                            "./*.js",
                            "**/*.js",
                            "**/*.xml",
                            "**/*.html",
                            "**/*.json",
                            "!**/*-dbg*.js",
                            "!**/Component-preload.js",
                        ],
                    },
                    dest: `${destUIDir}/`,
                    compatVersion: ui5Version
                },
                components: true,
            },
            allLibraries: {
                options: {
                    resources: {
                        cwd: `${srcUIDir}`,
                        src: [
                            "**/*.js"
                        ]
                    },
                    dest: `${destUIDir}/`,
                    compatVersion: ui5Version
                },
                libraries: true
            }
        },
        clean: {
            all_css: [
                `${srcUIDir}/**/*.css`,
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
                    "**/library-preload.json", 
                    "**/library-preload.js"
                ],
                expand: true
            }
        },
        copy: {
            all: {
                files: [{
                    expand: true,
                    cwd: `${srcUIDir}`,
                    src: '**/*',
                    dest: `${destUIDir}/`
                }]
            }
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
        // "clean",
        "openui5_theme:library",
        "less:style",
        "openui5_preload:ps",
        "openui5_preload:allLibraries",
        "copy:all"
        // "openui5_preload:library.source.less",
        // "clean:process",
    ]);

    grunt.registerTask("clean_dev", [
        "clean:all_css",
        "clean:all_js_debug",
        "clean:all_js_preload"
    ]);
    grunt.registerTask("qunit_test", [
        "connect:testServer",
        "qunit_junit",
        "qunit"
    ]);
};