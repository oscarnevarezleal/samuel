
var JM_API_HOST = 'www.xbundlelabs.com';
var JM_API_PATH = '/jademodules/wp-content/themes/samuel/services';

(function(){

	var Log = require('log'), log = new Log('info');

	var basePath = __dirname + '/../';

	var cachePath = basePath  + '.jade_cache/';
	var cacheFile = basePath  + '.jm.jade';
	var cacheJsFile = basePath  + 'lib/.jm.js';
	var JmJadeCoreFile = basePath  + 'lib/jm.jade';

	var mkdirp = require("mkdir");
		mkdirp.mkdirsSync(cachePath, function (err) {
			// if (err) console.error(err)
	});

	var template = require("./template.js");

	var JMApiListener = function(){
		this.data = {};

		this.add = function(method, resultCode, callback){
			this.data[method] = callback;
			return this;
		};

		this.get = function(method){
			return this.data[method];
		};

		this.callIfAny = function(method){
			
			var args = Array.prototype.slice.call(arguments), margs = args.length > 1 ? args.slice(1) : [];

			var listener = this.get(method), result = listener && listener.apply(null, margs);
		}
	}
	
	var JMApiIntent = function(method, params, settings){
		var me = this;
			me.options = {};
			me.settings = settings||{};

		me.call = function(){

			var http = require('http');

			var serializeParams = function(obj) {
			  var str = [];
			  for(var p in obj)
				if (obj.hasOwnProperty(p)) {
				  str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				}
			  return str.join("&");
			}

			var options = {
			  host: JM_API_HOST,
			  port: 80,
			  query: params,
			  path: '/' + JM_API_PATH + "/search.php?" + serializeParams(params)
			};

			callback = function(response) {
			  var str = '';

			  //another chunk of data has been recieved, so append it to `str`
			  response.on('data', function (chunk) {
				str += chunk;			    
			  });

			  //the whole response has been recieved, so we just print it out here
			  response.on('end', function () {

				var data = JSON.parse(str);

				//console.log('JSON parsed data', typeof(data));
				
				me.options.onsuccess && me.options.onsuccess(data);

				me.settings.onResult && me.settings.onResult(data);

			  });
			}

			http.request(options, callback).end();
			
		};
		
		me.success = function(onsuccess){
			this.options.onsuccess = onsuccess;
			return me;
		};

		me.error = function(onerror){
			this.options.onerror = onerror;
			return me;
		};
	}

	var JM = {

		listeners: new JMApiListener(),

		api: function(method, params){

			return new JMApiIntent(method, params, {
				onResult : function(data){
					var e = JM.listeners.get(method), r = e && e(data, params);
				}
			});

		},

		listen: function(eventName, eventResult, callback){
			JM.listeners.add(eventName, eventResult, callback);
		},

		io:{

			stdin: '',

			states:{
				readingPipe: false
			},

			listenPipes: function(listen){
				
				if(!listen)
					return;

				var self = process.stdin;
				
				/*JM.listeners.add("pipeBegins", null, function(data){
					var e = JM.listeners.get("pipeBegins"), r = e && e(data, null);
				});

				JM.listeners.add("pipeEnds", null, function(data){
					var e = JM.listeners.get("pipeEnds"), r = e && e(data, null);
				});*/

				self.on('readable', function() {

					JM.io.readingPipe = true;
					
					var chunk = process.stdin.read();

					if (chunk === null) {
						JM.io[JM.io.stdin == "" ? '__withoutAnyPipe' : '__withAppendPipe']();
					}else {
						JM.io.stdin += chunk;
					}

					return false;
				
				});

				self.on('end', function() {
					
					JM.io.readingPipe = false;
					JM.io.__withEndPipe(JM.io.stdin);

					JM.io.stdin = "";

				});

			},

			__withPipe: function(data){
				JM.listeners.callIfAny("pipeBegins", data.trim());
			},

			__withoutAnyPipe: function(data){
				//console.log('__withoutAnyPipe');
				JM.listeners.callIfAny("pipeEmpty", null);
			},

			__withAppendPipe: function(data){
				//console.log('__withAppendPipe');
				//JM.listeners.callIfAny("pipeEmpty", null);
			},

			__withEndPipe: function(data){
				//console.log('__withEndPipe', data);
				JM.listeners.callIfAny("pipeEnds", data);
			},

			readCoreFile: function(callback){
				JM.io.file_read_contents(JmJadeCoreFile, function(jmJade){

					var writter = function(contents){
						callback(jmJade, contents);						
					};

					JM.io.getModulesFilesContent(cachePath, {
						callback: writter
						,decorator: JM.jade.moduleContentsDecorator
					});

				});

			},

			installModule: function(param_name, args){
				if(args.length >0){

					JM.api("getpackage", { name : param_name, q : param_name })
					.success(function(d){

					})
					.error(function(e){

					})
					.call();
					
				}else{

				}
			},

			resolveModuleContents: function(name, callback){
				
				var modulePath = cachePath + name + '/';
				try{
					
					JM.io.getModulesFilesContent(modulePath, {callback: callback || function(result){
						process.stdout.write(result);
					}});
				
				}catch(e){
					log.error("resolveModuleContents error ", e);
				}

			},

			resolveCacheFileContents: function(){

				process.stdin.resume();
				process.stdin.setEncoding('utf8');

				process.stdin.on('data', function(data) {
					JM.io.readCoreFile(function(coreFileData, contents){
						JM.io.file_put_contents(cacheFile, template.DOCS + coreFileData + contents);
					});
				});
				
			},

			file_read_contents: function(file, Onresult){
				var fs = require('fs');
				fs.readFile(file,'utf-8',function(err,result){
					if (err) throw err;
					Onresult && Onresult(result);
				});	
			},

			file_put_contents:  function(file, contents){
				var fs = require('fs');
				fs.writeFile(file, contents, function(err) {
					if(err) {

					} else {

					}
				}); 
			},

			saveModuleContents: function(data, params){

				var fs = require('fs');

				if(!data || (data.length == 0))
					return;

				var moduleName = data.name;
				var path = cachePath + moduleName;
				var filename = path + '/' + moduleName + '.jade';

				//console.log('saveModuleContents', data);

				try{
					mkdirp.mkdirsSync(path, function (err) {
						JM.io.file_put_contents(filename, data.content);
					});
					JM.io.file_put_contents(filename, data.content);
				}catch(e){

				}

				JM.io.rebuildCacheFile();

			},

			getModulesFilesContent: function(dir, options){

				var fs = require('fs');

				var options = options || {
					decorator : JM.jade.moduleContentsDecorator,
					callback: null
				};

				var errHandler = function(e){
					if(e)
						log.error(e);
					return "";
				}

				fs.readdir(dir,function(err, files){
					
					if(err)
						return errHandler(err);
					
					var c=0, data = {}, dataAll = "\n\n";

					files.forEach(function(file){
						c++;

						var isDir = fs.lstatSync(dir+file).isDirectory();

						if(isDir){
							JM.io.getModulesFilesContent(dir + file + '/', {
								callback: function(result){

									var contents = result!=undefined ? result : "";
									
									var decoratedContent = options.decorator ? options.decorator(file, contents) : contents;

									dataAll+= decoratedContent;
									
									if (0===--c) {
										options.callback && options.callback(dataAll);
										return dataAll;
									}
								}
							});
							
						}else{
							fs.readFile(dir+file,'utf-8',function(err,result){
								if (err) throw err;
								
								data[file]=result;
								
								dataAll+= result!=undefined ? "\n" + result : "";
								
								if (0===--c) {
									options.callback && options.callback(dataAll);
									return dataAll;
								}
							});							
						}
						
					});
				});
			},

			rebuildCacheFile: function(options){
				
				var options = options || {};
				var contents = '';

				JM.io.readCoreFile(function(coreFileData, contents){
					JM.io.file_put_contents(cacheFile, template.DOCS + coreFileData + contents);
				});

			},

			updateAll: function(){
				var fs = require('fs');
				var dir = basePath + '/.jade_cache/';

				fs.readdir(dir, function(err, files){
					
					if (err) throw err;
					
					var c=0, data = {}, dataAll = "\n\n", modules = [];

					files.forEach(function(file){
						
						c++;

						var isDir = fs.lstatSync(dir+file).isDirectory();

						if(isDir){
							modules.push(file);
						}

						if (0===--c) {

							var m = "";

							while(m = modules.shift()){
								


								JM.api("getpackage", { name : m }).success(function(d){

								}).error(function(e){

								}).call();
							}
						}

					});

				});
			}
		},

		jade: {
			tabContent: function(contents, tabCount){
				var e = contents.replace(/^\n$/gm,"");
					e = e.split("\n");
					e = e.map(function(value){

						if(value == "\t" || value =="")
							return "";
						
						var tabs = value.split(/\t/), len = tabs.length;

						return value.replace(new RegExp("^\t{" + (len-1) + "}"), Array(len+1).join("\t"))

					});
					
					e = "\n" + e.join("") + "\n";

				return e;
			},

			mixinifyContent: function(alias, contents){
				return template.HEADER_MIXIN + 
						"\nmixin jm_"+alias+'()' +
						JM.jade.tabContent(contents);
			},

			formatLibContent: function(alias, contents){
				return template.HEADER + 
						contents;
			},

			setStrategyDecoration: function(alias, contents){

				var isMixin = contents.indexOf("mixin ") > -1;
				var isGist = !isMixin;

				if(isGist){
					return JM.jade.mixinifyContent(alias, contents);
				}else if(isMixin){
					return JM.jade.formatLibContent(alias, contents);
				}
			},

			moduleContentsDecorator: function(alias, contents){					
				
				return JM.jade.setStrategyDecoration(alias, contents);
				
			},

			eval: function(module, args, callback){

				var jade = require('jade');
				var mixin = module;

				if(!module||module==undefined){
					console.log("No module specified");
					return;
				}

				if(module.indexOf(".")!=-1){
					var splits = module.split("."), module = splits[0];
					mixin = splits[splits.length-1];
				}

				var whenInPipes = function(data, usePipeData, eventResult){

					//console.log(data, usePipeData, eventResult, JM.io.readingPipe);
					//console.log("whenInPipes", module, mixin);
					
					JM.io.readCoreFile(function(core){
						JM.io.resolveModuleContents(module, function(contents){

							contents = core + contents;

							// mixin invocation
							if(mixin!=''){
								contents+= "\n+" + mixin + "(" + args.join(",") + ")"
							}

							if(!data || !usePipeData){

								// no pipe

							}else{

								//use pipe data as jade block
								if(data != "" && usePipeData){
									//uncomment for replace block in definition
									//contents = contents.replace(/^((\t+)?block)$/gm, "$2" + "| \n\t");+data;
									//uncomment below for call it in jade
									data = data.replace(/\r\n+/gm, "\n\t| ");								
									contents += "\n\t| "+data;
								}
							}


							// Compile a function
							var fn = jade.compile(contents, {pretty: true});

							var html = fn();

							//console.log(contents);
							//console.log(html);

							callback && callback(null, html);

							process.abort();

						});
					});
				};

				JM.listeners.add("pipeEnds", null, function(result){
					whenInPipes(result, true, "pipeEnds");
				});

				JM.listeners.add("pipeEmpty", null, function(result){
					whenInPipes(result, false, "pipeEmpty");
				});

				JM.io.listenPipes(true);
				
			}
		},

		version:{
			get: function(){
				var readJson = require('read-package-json')

				// readJson(filename, [logFunction=noop], [strict=false], cb)
				readJson( basePath + 'package.json', console.error, false, function (er, data) {
				  
				  if (er) {
					console.log("There was an error reading the file");
					return;
				  };

				  var v = 1;
				  
				  console.log(v);

				});
			}
		}

	};


	//--------------------------------------------------------------------------------
	//LISTENERS
	//--------------------------------------------------------------------------------

	JM.listen('getpackage', null, function(data, params){

		//console.log('getpackage', data, params);

		if(!data || data.length == 0){

			log.error('No results for ' + params.name +  ' ');

		}else if(data.length>1){

			var promptly = require('promptly');
			var _ = require('underscore');
			
			var list = _(data).map(function(a){				
				return a;
			});

			data.forEach(function(item, i){
				console.log('  %d) %s', i , item.name + ' by ' + item.author);
			});

			promptly.choose('Select', _.keys(list), function (err, value) {
				console.log('You´ve selected:', data[value].name);
				JM.io.saveModuleContents(data[value].name, params);
			});

		}else{

			JM.io.saveModuleContents(data[0], params);			
		}
	
	}, []);

	//--------------------------------------------------------------------------------
	//PIPES
	//--------------------------------------------------------------------------------
	
	module.exports = JM;

})();

