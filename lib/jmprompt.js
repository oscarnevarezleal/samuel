var program = require('commander');
var Command = program.Command;

Command.prototype.promptSingleLine = function(name){
	program.prompt('Username: ', function(name){
  		console.log('hi %s', name);
	});
}
Command.prototype.promptMultiLine = function(desc){
	program.prompt('Description:', function(desc){
  		console.log('description was "%s"', desc.trim());
	});
}

Command.prototype.prompt = function(str, fn){
  if (/ $/.test(str))
  	return this.promptSingleLine.apply(this, arguments);
  this.promptMultiLine(str, fn);
};

Command.prototype.choose = function(list, fn){
  var self = this;

  list.forEach(function(item, i){
    console.log('  %d) %s', i + 1, item);
  });

  function again() {
    self.prompt('  : ', function(val){
      val = parseInt(val, 10) - 1;
      if (null == list[val]) {
        again();
      } else {
        fn(val, list[val]);
      }
    });
  }

  again();
};

/**
 * Expose the root command.
 */

exports = module.exports = new Command;

/**
 * Expose `Command`.
 */

exports.Command = Command;