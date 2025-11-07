/*eslint-env node*/
'use strict';

module.exports = function(grunt) {

	grunt.initConfig({

		dir: {
			reports : 'reports'
		},

		
		
		qunit: {
			opa: {
				options: {
					urls: [
						"http://localhost:3000/hc/hph/cdw/config/tests/ui/src/cdwconfig-opa5.html"
					],					
					timeout: 900000
				}

			}
		},
		qunit_junit: {
	        options: {
	        	dest: '<%= dir.reports %>/test',
	        	namer: function (url) {
	        		console.error(url);
	                var match = url.match(/test-resources\/(.*)$/);
	                return match[1].replace(/\//g, '.');
	            }
	        }
	    },
		
		webdriver_start: {
			options : {
			port: '4444'
			}
		},
		webdriver_qunit: {
			linux: {
			options: {
				browserNames: ['chrome', 'firefox', 'ie'],
				reportsDir: '/reports',
				qunitJson: '../qunit.json',
				baseUrl: 'http://localhost:8000'
			}
			}
		}
  
  
	});	
	grunt.loadNpmTasks('grunt-webdriver-qunit');
	grunt.registerTask('test', ['webdriver_startup', 'webdriver_qunit']);

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-openui5');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-qunit-junit');
	grunt.loadNpmTasks('grunt-webdriver-qunit');

	// Test task 
	grunt.registerTask('opaTest', ['qunit:opa']);

	// Default task
	grunt.registerTask('default', [
		'opaTest']);
};
