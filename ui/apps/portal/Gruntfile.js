/* global module, require */

module.exports = function (grunt) {
  "use strict";
  var srcUIDir = "./src/plugins/mri";
  var destUIDir = "../../resources/mri-ui5";
  var ui5Version = "1.52";

  grunt.initConfig({
    less: {
      style: {
        options: {
          compress: true,
        },
        files: [
          {
            expand: true,
            cwd: `./${srcUIDir}/`,
            src: ["**/css/style.less"],
            dest: `${srcUIDir}/`,
            ext: ".css",
          },
        ],
      },
    },
    openui5_theme: {
      library: {
        options: {
          compiler: {
            compress: true,
          },
        },
        files: [
          {
            expand: true,
            cwd: `${srcUIDir}/`,
            src: ["**/themes/**/library.source.less"],
            dest: `${srcUIDir}/`,
          },
        ],
      },
    },
    openui5_preload: {
      cdm: {
        options: {
          resources: {
            cwd: `${srcUIDir}/CDM/ui5`,
            src: [
              "./*.js",
              "**/*.js",
              "**/*.xml",
              "**/*.html",
              "**/*.json",
              "!**/*-dbg*.js",
              "!**/Component-preload.js",
            ],
            prefix: "hc/hph/cdw/config/ui",
          },
          dest: `${srcUIDir}/CDM/ui5`,
          compatVersion: ui5Version,
        },
        components: true,
      },
      pa_config: {
        options: {
          resources: {
            cwd: `${srcUIDir}/PatientAnalyticsConfig/ui5`,
            src: [
              "./*.js",
              "**/*.js",
              "**/*.xml",
              "**/*.html",
              "**/*.json",
              "!**/*-dbg*.js",
              "!**/Component-preload.js",
            ],
            prefix: "pa-config-svc/ui",
          },
          dest: `${srcUIDir}/PatientAnalyticsConfig/ui5`,
          compatVersion: ui5Version,
        },
        components: true,
      },
      ps_config: {
        options: {
          resources: {
            cwd: `${srcUIDir}/PatientSummaryConfig/ui5`,
            src: [
              "./*.js",
              "**/*.js",
              "**/*.xml",
              "**/*.html",
              "**/*.json",
              "!**/*-dbg*.js",
              "!**/Component-preload.js",
            ],
            prefix: "hc/hph/config/patient/ui/",
          },
          dest: `${srcUIDir}/PatientSummaryConfig/ui5`,
          compatVersion: ui5Version,
        },
        components: true,
      },
      allLibraries: {
        options: {
          resources: {
            cwd: `${srcUIDir}/`,
            src: ["**/*.js"],
          },
          dest: `${srcUIDir}/`,
        },
        libraries: true,
      },
    },
    clean: {
      all_css: [`${srcUIDir}/**/*.css`, "!**/vue/css/**/*.css", `!${srcUIDir}/ps/**/*.css`],
      all_js_debug: {
        cwd: `${srcUIDir}`,
        src: "**/*-dbg*.*",
        expand: true,
      },
      all_js_preload: {
        cwd: `${srcUIDir}`,
        src: ["**/Component-preload.js", "**/library-preload.json", "**/library-preload.js"],
        expand: true,
      },
      process: {
        cwd: "process",
        src: "**",
        expand: true,
      },
    },
    copy: {
      originalsToProcess: {
        files: [
          {
            expand: true,
            cwd: `${srcUIDir}`,
            src: [
              "./*.js",
              "./**/*.js",
              "!**/*-dbg*.js",
              "!**/Component-preload.js",
              "!**/vue/**/*.*",
              "!**/vue/Component-preload.js",
            ],
            dest: "process/",
            rename: function (dest, src) {
              var aSrc = src.split(".");
              var ext = aSrc.pop();
              return dest + (ext === "js" ? src.replace(/(\.controller)?\.js$/, "$1.js") : src);
            },
          },
        ],
      },
      processToOriginals: {
        files: [
          {
            expand: true,
            cwd: "process",
            src: ["**/*", "**/.*"],
            dest: `${srcUIDir}`,
          },
        ],
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
    },
  });

  grunt.loadNpmTasks("grunt-openui5");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  //generate css
  grunt.registerTask("css", ["clean:all_css", "openui5_theme:library", "less:style"]);

  // generate css, preload, and -dbg files
  grunt.registerTask("production", [
    "clean",
    "openui5_theme:library",
    "less:style",
    "openui5_preload:cdm",
    "openui5_preload:pa_config",
    "openui5_preload:ps_config",
    "openui5_preload:allLibraries",
    "copy:originalsToProcess",
    "copy:processToOriginals",
    "clean:process",
    "copy:copyToDestination",
  ]);

  grunt.registerTask("clean_dev", ["clean:all_css", "clean:all_js_debug", "clean:all_js_preload"]);
  grunt.registerTask("dbg", ["copy:originalsToProcess", "copy:processToOriginals"]);
};
