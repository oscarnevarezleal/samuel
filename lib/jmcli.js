var jm = require("./jm.js");
var cli = require('cli'), options = cli.parse();

module.exports = {

	read: function(){

		cli.parse({
			log:   ['l', 'Enable logging'],
			module: ['m', 'Get module'],
			install: ['i', 'Install a module'],
			adduser: ['u', 'Auth']
		});

		cli.main(function(args, options) {


			var lastParam = args[args.length-1];
			
			//console.log("Main", args, options, lastParam);

			if(options.install){
				jm.io.installModule(lastParam, args);					
			}else if(options.updateAll){
				jm.io.updateAll();
			}else if(options.localUpdate){
				jm.io.rebuildCacheFile();
			}else if(options.module){
				jm.io.resolveModuleContents(lastParam);
			}else if(options.version || options.v){
				jm.version.get();
			}
		});

	},

	eval: function(){

		cli.parse({
			log:   ['l', 'Enable logging'],
			module: ['m', 'Get module'],
			install: ['i', 'Install a module'],
			adduser: ['u', 'Auth']
		});

		cli.main(function(args, options) {

			var moduleNameArgIndex = 0;
			
			var module = args[moduleNameArgIndex];

			var margs = args.splice(moduleNameArgIndex + 1);

			jm.jade.eval(module, margs, function(err, html){
				console.log(html);
			});
		
		});

	}

};