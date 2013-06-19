//todo: events support
var ext = require('prime-ext');
var prime = ext(require('prime'));
var Class = require('Classy');
var type = require('prime/util/type');
var string = ext(require('prime/es5/string'));
var array = ext(require('prime/es5/array'));
var fn = require('prime/es5/function');
var regexp = require('prime/es5/regexp');
var Emitter = require('prime/util/emitter');
var fs = require('fs');
var Options = require('prime-ext/options');
var Registry = require('prime-ext/registry');

var Smarty = require('tag-template/smarty');
Smarty.registerMacro('page', function(node, template){
    if(node.attributes.wrapper && template.wrapperSet){
        template.wrapperSet(node.attributes.wrapper);
    };
    var rootPanel = template.getRoot();
    if(node.attributes.title){
        //rootPanel.environment['page_title'] = node.attributes.title;
    };
    return '';
});
Smarty.registerMacro('panel', function(node, template){
    var res = '';
    if(!node.attributes.name) throw('panel macro requires \'name\' attribute');
    var subpanel = new Templates.Panel(node.attributes.name, {onLoad:function(subpanel){
        subpanel.template.progenitor = template;
    }.bind(template)});
    var id = template.async(); //template indirection makes me uncomfortable
    if(template.panel && template.panel.env) subpanel.env = template.panel.env;
    subpanel.render(function(panel){
        template.return(id, panel);
    }.bind(template));
    return id;
});//*/

var TemplateData = require('tag-template/data');
var Templates = {options:{}};
Templates.options.base = '';
Templates.options.controllerDirectory = 'App/Controllers';
Templates.options.templateDirectory = 'App/Panels';
Templates.options.controllerType = 'controller.js';
Templates.options.templateType = 'panel.tpl';
Templates.options.wrapperType = 'wrapper.tpl';
Templates.options.caching = false;
Templates.options.caches = {
    templates : {},
    data : {}
};
Templates.set = function(key, value){
    if(key && type(key) == 'object' && !value){
        prime.each(key, function(value, key){
            Templates.set(key, value);
        })
    }else{
        Templates.options[key] = value;
        //console.log('set '+key+' to '+value);
    }
};
Templates.load = function(file, callback){
    var fs = require('fs');
    if(callback) fs.readFile(file, function(err, data){
        var dt = data?data.toString():'';
        //if(data) data = data.toString();
        callback(err, dt);
    });
    else return fs.readFileAsync(file).toString();
};
Templates.exists = function(file, callback){
    var fs = require('fs');
    if(callback) fs.exists(file, callback);
    else return fs.existsSync(file);
};
Templates.Wrapper = function(name, options){
    if(type(options) == 'function') options = {onLoad:options};
    if(!options) options = {};
    options.templateType = Templates.options.wrapperType;
    return new Templates.Panel(name, options);
};
Templates.Panel = new Class({
    Implements : [Emitter, Options],
    data : {},
    env : false,
    options : {
        fetchTemplate : function(callback){
            var dir = this.options.templateDirectory || Templates.options.templateDirectory;
            var type = this.options.templateType || Templates.options.templateType;
            var file = Templates.options.base+dir+'/'+this.name+'.'+type;
            Templates.load(file, fn.bind(function(err, data){
                if(err) throw(err);
                else{
                    this.template = new Smarty(data);
                    this.template.wrapperSet = this.options.wrapperSet;
                    this.template.panel = this;
                    //todo: handle delayed renders
                    array.forEach(this.delayed, fn.bind(function(item){
                        this.render(item.data, item.callback);
                    }, this));
                    callback(data);
                }
            }, this));
        },
        fetchData : function(callback, error, env){
            var dir = this.options.controllerDirectory || Templates.options.controllerDirectory;
            var type = this.options.controllerType || Templates.options.controllerType;
            var fileName = Templates.options.base+'/'+dir+'/'+this.name+'.'+type;
            if(!callback) throw('OMG Sync!');
            if(Templates.caching && Templates.caches.data[this.name]){
                //todo: handle out-of-date data
                callback(Templates.caches.data[this.name]);
            }else{
                Templates.load(fileName, fn.bind(function(err, data){
                    if(err){
                        if(error) error(err);
                        callback({});
                    }else{
                        //todo: caching
                        var renderer = new TemplateData();
                        var require = Templates.internalRequire || require;
                        var count = 0;
                        var Protolus = GLOBAL.Protolus || {};
                        var check = function(){
                            if(count == 0) callback(renderer.data);
                        };
                        var keys = prime.keys(env);
                        var length = keys.length;
                        if(data) for(var lcv=0; lcv < length; lcv++){
                            eval('var '+keys[lcv]+' = env[\''+keys[lcv]+'\'];');
                        }
                        renderer.async = function(callback){
                            count++;
                            var rtrn = function(){
                                count--;
                                check();
                            };
                            callback(rtrn);
                        }
                        try{
                            eval(data);
                        }catch(ex){
                            console.log('ERROR', fileName, ex);
                            count = 0;
                        }
                        this.data = renderer.data;
                        check();
                    }
                }, this));
            }
        },
        wrapperSet : function(){}
    },
    delayed : [],
    template : null,
    name : null,
    initialize : function(name, options){
        this.name = name;
        if(type(options) == 'function') options = {onLoad:options};
        this.setOptions(options);
        this.options.fetchTemplate.apply(this, [fn.bind(function(){
            if(options && options.onLoad) options.onLoad(this);
        }, this)]);
    },
    getData : function(){
        return this.data;
    },
    setData : function(data){
        this.template.environment.data = data;
    },
    render : function(data, callback){
        var env = this.env || Templates.env;
        if(type(data) == 'function'){
            callback = data;
            this.options.fetchData.apply(this, [function(fetchedData){
                this.data = fetchedData;
                this.render(fetchedData, callback); 
            }.bind(this), function(){}, env]);
            return;
        }
        if(this.template){
            this.template.environment.data = data;
            var name = this.name;
            this.template.render(data, function(){
                Templates.Panel.count(name);
                callback.apply(this, arguments);
            });
        }else this.delayed.push({data:data,callback:callback});
    }
});

Templates.Panel.renderCounts = {};
Templates.Panel.count = function(panel){
    if(!Templates.Panel.renderCounts[panel]) Templates.Panel.renderCounts[panel] = 0;
    return Templates.Panel.renderCounts[panel]++;
};
Templates.Panel.exists = function(panel, filetype, callback){
    if(!callback && type(filetype) == 'function'){
        callback = filetype;
        delete filetype;
    }
    //strip args
    panel = (panel.indexOf('?') != -1)?panel.substring(0, panel.indexOf('?')-1):panel;
    var dir = Templates.options.templateDirectory;
    if(dir.indexOf("/") === 0) dir = dir.substring(1);
    var file = './'+dir+'/'+panel+'.'+(filetype?filetype:Templates.options.templateType);
    return Templates.exists(file, callback);
};
Templates.Panel.date = function(timestamp, format){
    var dateformat = require('dateformat');
    return dateformat(new Date(timestamp), format);
};

Templates.renderPage = function(panelName, options){
    var anchor = {};
    if( type(options) == 'function' ) options = {
        'onSuccess':options
    };
    if(!options) options = {};
    if(!options.resources) options.resources = [];
    var panel = new Templates.Panel(panelName, {
        wrapperSet : function(newWrapper){
            anchor.wrapper = newWrapper;
        },
        onLoad :function(panel){ //make sure panel.template is loaded
            if(options.env) panel.env = options.env;
            panel.render(function(content){
                if(!anchor.wrapper){
                    options.onSuccess(content);
                    return;
                }
                var wrapper = new Templates.Wrapper(anchor.wrapper, function(){
                    var data = prime.clone(panel.data);
                    data.content = content;
                    if(options.env) wrapper.env = options.env;
                    wrapper.render(data, function(wrappedContent){
                        options.onSuccess(wrappedContent);
                    }); 
                });
            });
        }
    });
};

Templates.insertTextAtTarget = function(text, target, html){
    var signature = '<!--['+target.toUpperCase()+']-->';
    return html.replace( signature, function(){ return text+signature } );
};
Templates.env = {};
module.exports = Templates;