//todo: events support
var prime = require('prime');
var Class = require('Classy');
var type = require('prime/util/type');
var string = require('prime/es5/string');
var array = require('prime/es5/array');
array.forEachEmission = function(collection, callback, complete){ //one at a time
    var a = {count : 0};
    var fn = function(collection, callback, complete){
        if(a.count >= collection.length){
            if(complete) complete();
        }else{
            callback(collection[a.count], a.count, function(){
                a.count++;
                fn(collection, callback, complete);
            });
        }
    };
    fn(collection, callback, complete);
};
array.forAllEmissions = function(collection, callback, complete){ //parallel
    var a = {count : 0};
    var begin = function(){
        a.count++;
    };
    var finish = function(){
        a.count--;
        if(a.count == 0 && complete) complete();
    };
    array.forEach(collection, function(value, key){
        begin();
        callback(value, key, function(){
           finish(); 
        });
    });
};
array.combine = function(thisArray, thatArray){ //parallel
    var result = [];
    array.forEach(thatArray, function(value, key){
        result.push(value);
    });
    return result;
};
array.contains = function(haystack, needle){ //parallel
    return haystack.indexOf(needle) != -1;
};
prime.keys = function(object){
    var result = [];
    for(var key in object) result.push(key);
    return result;
};
prime.clone = function(obj){
    var result;
    switch(type(obj)){
        case 'object':
            result = {};
            for(var key in obj){
                result[key] = prime.clone(obj[key]);
            }
            break;
        case 'array':
            result = obj.slice(0);
            break;
        default : result = obj;
    }
    return result;
};
string.startsWith = function(str, sub){
    return str.indexOf(sub) === 0; //likely more expensive than needed
};
string.endsWith = function(str, sub){
    return str.substring(str.length-sub.length) === sub;
};
var fn = require('prime/es5/function');
var regexp = require('prime/es5/regexp');
var Emitter = require('prime/util/emitter');
var fs = require('fs');

var Options = new Class({
    setOptions : function(options){
        if(!this.options) this.options = {};
        var value;
        for(var key in options){
            value = options[key];
            if(this.on && key.substring(0,2) == 'on' && key.substring(2,3) == key.substring(2,3).toUpperCase()){
                var event = key.substring(2,3).toLowerCase()+key.substring(3);
                this.on(event, value);
            }
            this.options[key] = value;
        }
    }
});

var Registry = new Class({
    registry : {},
    initialize : function(name){
    
    },
    register : function(key, value){
        this.registry[key] = value;
    },
    get : function(key){
        return this.registry[key];
    }
});

var Templates = function(options){
    if(!Templates.load){
        if(!options) options = {};
        Templates.templateCache = {};
        if(options.scriptDirectory) Templates.scriptDirectory = options.scriptDirectory;
        else Templates.scriptDirectory = '/App/Controllers';
        if(options.templateDirectory) Templates.templateDirectory = options.templateDirectory;
        else Templates.templateDirectory = '/App/Panels';
        if(options.doLoad) Templates.load = options.doLoad;
        else Templates.load = function(file, callback){
            var fs = require('fs');
            if(callback) fs.readFile(file, 'utf8', callback);
            else return fs.readFileAsync(file);
        };
        if(options.doTestExistence) Templates.load = options.doTestExistence;
        else Templates.exists = function(file, callback){
            var fs = require('fs');
            if(callback) fs.exists(file, callback);
            else return fs.existsAsync(file);
        };
    }
};

Templates.Template = new Class({
    Implements : [Emitter, Options],
    initialize: function(text, options){
        this.setOptions(options);
    },
    render : function(data, callback){
        return this.root.render();
    }
    
});
Templates.TemplateData = new Class({
    data : {},
    set: function(key, value){
        var accessor = 'this.data';
        var parts = key.split('.')
        var current = this.data;
        var part;
        while(parts.length > 0){
            part = parts.pop();
            accessor += '[\''+part+'\']';
            try{
                eval('if(!'+accessor+'){ '+accessor+' = {};}');
            }catch(error){}
        }
        eval(accessor+' = value;');
        current;
    },
    get : function(key){
        var parts = key.split('.')
        var current = this.data;
        while(parts.length > 0){
            current = current[parts.pop()];
        }
        return current;
    },
    getData : function(){
        return this.data;
    }
    
});//*/
Templates.TagParser = new Class({ //my ultra-slim tag parser
    strict : true,
    opener : '<',
    closer : '>',
    attributeAssign : '=',
    attributeDelimiters : ['"'],
    closeEscape : '/',
    allowUndelimitedAttributes : false,
    literalTags : [],
    unaryTags : [],
    specialTags : {},
    unrecognized : 'unary',
    initialize: function(options){
        prime.each(options, fn.bind(function(option, name){
            this[name] = option;
        }, this));
        if(type(this.literalTags) == 'string') this.literalTags = this.literalTags.split(',');
        if(type(this.attributeDelimiters) == 'string') this.attributeDelimiters = this.attributeDelimiters.split(',');
        //console.log(['this', this]);
    },
    open: function(tag){
        this.tagStack.push(tag);
        //console.log('open:'+tag.name);
    },
    content: function(text){
        if(this.tagStack[this.tagStack.length-1]){
            if(!this.tagStack[this.tagStack.length-1].children) this.tagStack[this.tagStack.length-1].children = [];
            this.tagStack[this.tagStack.length-1].children.push(text);
        }
    },
    close: function(tag){
        //console.log('close:'+tag.name);
        var tag = this.tagStack.pop(tag);
        if(this.tagStack[this.tagStack.length-1]){
            if(!this.tagStack[this.tagStack.length-1].children) this.tagStack[this.tagStack.length-1].children = [];
            this.tagStack[this.tagStack.length-1].children.push(tag);
        }
        this.lastTag = tag;
    },
    error: function(exception){
        console.log(exception);
    },
    parse: function(xmlChars){
        var recognizedTags = array.combine(
            this.unaryTags.slice(0), array.combine(
                this.literalTags, prime.keys(this.specialTags)
            )
        );
        var tagOpen = false;
        var currentTag = '';
        var content = '';
        var ch;
        this.tagStack = [{}];
        var tagStack = [];
        var literalMode = false;
        var literal = this.literalTags[0];
        var strictError = 'Strict parse error: Unmatched Tag!';
        for(var lcv = 0; lcv < xmlChars.length; lcv++){
            ch = xmlChars[lcv];
            //console.log(['char', ch, xmlChars.substring(lcv, lcv+literal.length+3)]);
            if(tagOpen){
                if(ch == this.closer){
                    //console.log('closer');
                    var tag = this.parseTag(currentTag);
                    if(tag.name[0] == this.closeEscape){
                        //console.log('close closing('+tag.name.substring(1)+') tag');
                        tag.name = tag.name.substring(1);
                        this.close(tag);
                        var lastTag = tagStack.pop();
                        if(this.strict && lastTag.name != tag.name){
                            this.error(strictError+' ['+lastTag.name+']');
                            return;   
                        }
                        //literalMode = this.literalTags.contains(tagStack[tagStack.length-1]);
                    }else{
                        //console.log('close opening tag');
                        this.open(tag);
                        tagStack.push(tag);
                        literalMode = array.contains(this.literalTags, tag.name);
                        if(literalMode) literal = tag.name;
                        if(
                            currentTag[currentTag.length-1] == this.closeEscape || 
                            array.contains(this.unaryTags, tag.name) ||
                            (this.unrecognized == 'unary' && !array.contains(recognizedTags, tag.name))
                        ){
                            this.close(tag);
                            var lastTag = tagStack.pop();
                            if(this.strict && lastTag.name != tag.name){
                                this.error(strictError+' ['+lastTag.name+']');
                                return;
                            }
                            //literalMode = this.literalTags.contains(tagStack[tagStack.length-1].name);
                        }
                    }
                    tagOpen = false;
                }else currentTag += ch;
                //console.log('tag char');
            }else{
                if(
                    ch == this.opener &&
                    (
                        !literalMode || // we aren't in literal mode, thus we could close any tag
                        (currentTag == 'literal' && xmlChars.substring(lcv, lcv+literal.length+3) == '{/'+literal+'}') //we are in literal mode and we're closing a literal tag
                    )
                ){
                    currentTag = '';
                    tagOpen = true;
                    if(content.trim() != '') this.content(content.trim());
                    content = '';
                    literalMode = false;
                }else content += ch;
                //console.log('ch++');
            }
        }
        if(content.trim() != '') this.content(content.trim());
        this.root = lastTag;
        return this.tagStack.shift();
    },
    parseTag: function(tag){
        var ch;
        var currentValue = '';
        var tagName = false;
        var attributeName = false;
        var inQuote = false;
        var attributes = {};
        for(var lcv = 0; lcv < tag.length; lcv++){
            ch = tag[lcv];
            if(tagName){
                var endedQuote = false;
                if(inQuote){
                    if(inQuote == ch){ //end of quote
                        inQuote = false;
                        endedQuote = true;
                    }else{
                        currentValue += ch;
                        continue;
                    }
                }else{
                    if(array.contains(this.attributeDelimiters, ch)){
                        inQuote = ch;
                        continue;
                    }
                }
                if(attributeName){
                    if(ch == ' ' || endedQuote){
                        attributes[attributeName.trim()] = currentValue;
                        attributeName = false;
                        currentValue = '';
                    }else currentValue += ch;
                }else{
                    if(ch == this.attributeAssign){
                        attributeName = currentValue;
                        currentValue = '';
                    }else currentValue += ch;
                }
                array.contains(this.attributeDelimiters, ch)
            }else{
                if(ch == ' '){
                    tagName = currentValue;
                    currentValue = '';
                }else currentValue += ch;
            }
        }
        if(attributeName && currentValue != ''){
            attributes[attributeName.trim()] = currentValue;
        }
        if(!tagName) tagName = currentValue;
        return {
            name: tagName,
            attributes: attributes,
            full : tag
        };
    }
});
Templates.TagTemplate = new Class({
    Extends : Templates.Template,
    parsedTemplate : null,
    tagRegistry : null,
    tagStack : [],
    root : null,
    progenitor : false,
    postProcessReturnCount : 0,
    initialize: function(text, options){
        this.parser = new Templates.TagParser(options);
        this.parser.strict = false;
        this.tagRegistry = new Registry();
        this.parent(options);
        //this.root = new Protolus.Template.RootNode();
        //this.tagStack.push(this.root);
        this.parsedTemplate = this.parser.parse(text);
    },
    setData : function(data){
    
    },
    getRoot : function(){
        //console.log('getroot', this.name, this.progenitor);
        if(!this.progenitor) return this;
        else return this.progenitor.getRoot();
    },
    renderNode : function(node){
        if(typeOf(node) == 'string'){
            return node;
        }else{
            switch(node.name){
                case 'foreach':
                    return '[FOR]';
                    break;
                case 'if':
                    return '[IF]';
                    break;
                //case '':
                    //break;
                default :
                    if(node.name.substring(0,1) == '$'){
                        return '[VAR]';
                        break;
                    }
            }
        }
    },
    async : function(){
        this.postProcessReturnCount++;
        return '{{{'+this.postProcessReturnCount+'}}}';
    },
    processReturn : function(id, text){
        if(id && text){
            this.rendered = this.rendered.replace(id, text);
        }
        this.postProcessReturnCount--;
        if(this.postProcessReturnCount == 0){
            this.renderCallback(this.rendered);
            delete this.renderCallback;
        }
    },
    render : function(data, callback){
        this.setData(data);
        var result = '';
        array.forEach(this.parsedTemplate.children, fn.bind(function(node){
            result += this.renderNode(node);
        }, this));
        if(this.postProcessReturnCount > 0){
            this.renderCallback = callback;
            this.rendered = result;
        }else callback(result);
    }
    
});

Templates.Template.Smarty = new Class({
    Extends : Templates.TagTemplate,
    Implements : [Templates.TemplateData],
    parent : false,
    targets : {},
    initialize: function(text, options){
        this.options = options;
        this.parent(text, {
            strict : true,
            opener : '{',
            closer : '}',
            attributeAssign : '=',
            attributeDelimiters : ['"', "'"],
            closeEscape : '/',
            allowUndelimitedAttributes : true,
            literalTags : ['literal'],
            specialTags : {
                'if':function(text){
                    
                },
                'foreach':function(text){
                
                }
            }
        });
        this.tagRegistry.register('test', function(node){
            return 'this is a test';
        });
    },
    renderNode : function(node){
        if(type(node) == 'string'){
            return node;
        }else{
            switch(node.name){
                case 'foreach':
                    var res = '';
                    if(!node.attributes.from) throw('foreach macro requires \'from\' attribute');
                    if(!node.attributes.item) throw('foreach macro requires \'item\' attribute');
                    var from = node.attributes.from;
                    var item = node.attributes.item;
                    var key = node.attributes.key;
                    if(!key) key = 'key';
                    if(from.substring(0,1) == '$') from = from.substring(1);
                    from = this.getVariable(from);
                    var func = fn.bind(function(value, index){
                        this.set(key, index);
                        this.set(item, value);
                        array.forEach(node.children, fn.bind(function(child){
                            res += this.renderNode(child);
                        }, this));
                    }, this);
                    if(type(from) == 'object') prime.each(from, func);
                    else array.forEach(from, func);
                    return res;
                    break;
                case 'page':
                    if(node.attributes.wrapper && this.options.wrapperSet){
                        this.options.wrapperSet(node.attributes.wrapper);
                    };
                    var rootPanel = this.getRoot();
                    if(node.attributes.title){
                        rootPanel.environment['page_title'] = node.attributes.title;
                    };
                    return '';
                    break;
                case 'require':
                    var rootPanel = this.getRoot();
                    if(node.attributes.name == undefined){
                        console.log(node.attributes);
                        throw('require macro requires \'name\' attribute');
                    }
                    if(!node.attributes.mode) node.attributes.mode = 'targeted';
                    if(!node.attributes.directory) node.attributes.directory = Protolus.resourceDirectory;
                    if(node.attributes.directory == "local") node.attributes.directory = "App/Resources";
                    if(!node.attributes.target) node.attributes.target = 'HEAD';
                    else node.attributes.target = node.attributes.target.toUpperCase();
                    var resources = node.attributes.name.split(',');
                    var result = '';
                    if(node.attributes.locality == 'remote'){
                        //todo: implement remote locality
                        if(node.attributes.mode == 'targeted'){
                            //local settings don't matter, just app level
                        }else{
                            resources.each(function(resourceName){
                                if(!rootPanel.containsResource(resourceName)){
                                    //todo: inline async
                                }
                            });
                        }
                    }else{
                        if(node.attributes.mode == 'targeted'){
                            rootPanel.ensureResources(resources, function(){}, node.attributes.directory);
                        }else{
                            //*
                            resources.each(function(resourceName){
                                if(!rootPanel.containsResource(resourceName)){
                                    //todo: reenable inline
                                    /*if(result == '') result = '<script>';
                                    id = this.async();
                                    result += id;
                                    //on return
                                    res.files('js', function(files){
                                        this.processReturn(id, files.join("\n"));
                                    }.bind(this));*/
                                }
                            }); //*/
                        }
                    }
                    if(result != '') result += '</scr'+'ipt>';
                    //modes: targeted(d), inline
                    return result;
                    break;
                case 'panel':
                    var res = '';
                    if(!node.attributes.name) throw('panel macro requires \'name\' attribute');
                    var subpanel = new Templates.Panel(node.attributes.name, {onLoad:function(subpanel){
                        subpanel.template.progenitor = this;
                    }.bind(this)});
                    var id = this.async(); //this indirection makes me uncomfortable
                    subpanel.render(function(panel){
                        this.processReturn(id, panel);
                    }.bind(this));
                    return id;
                    break;
                case 'if':
                    var res = '';
                    node.clause = node.full.substring(2).trim();
                    var conditionResult = this.evaluateSmartyPHPHybridBooleanExpression(node.clause);
                    var blocks = {'if':[]};
                    array.forEach(node.children, fn.bind(function(child){
                        if(blocks['else'] !== undefined){
                            blocks['else'].push(child);
                        }else{
                            if(type(child) == 'object' && child.name == 'else'){
                                blocks['else'] = [];
                                return;
                            }
                            blocks['if'].push(child);
                        }
                    }, this));
                    if(conditionResult){
                        array.forEach(blocks['if'], function(child){
                            res += this.renderNode(child);
                        }.bind(this));
                    }else if(blocks['else']){
                        array.forEach(blocks['else'], fn.bind(function(child){
                            res += this.renderNode(child);
                        }, this));
                    }
                    return res;
                    break;
                case 'literal':
                    return node.children.join("\n");
                    break;
                default :
                    if(node.name.substring(0,1) == '$'){
                        return this.get(node.name.substring(1));
                    }
            }
        }
    },
    getVariable : function(variable){
        return this.get(variable);
    },
    evaluateSmartyPHPHybridBooleanExpression : function(expression){
        //var pattern = /[Ii][Ff] +(\$[A-Za-z][A-Za-z0-9.]*) *$/s;
        var pattern;
        var parts;
        expression = expression.trim();
        if(expression.toLowerCase().substring(0, 2) == 'if'){
            //todo: multilevel
            expression = expression.substring(2).trim();
            var expressions = expression.split('&&');
            var value = true;
            expressions.each(function(exp){
                value = value && this.evaluateSmartyPHPHybridBooleanExpression(exp);
            });
            return value;
        }else{
            pattern = new RegExp('(.*)( eq| ne| gt| lt| ge| le|!=|==|>=|<=|<|>)(.*)', 'm');
            parts = expression.match(pattern);
            if(parts && parts.length > 3){
                var varOne = this.evaluateSmartyPHPHybridVariable(parts[1].trim());
                var varTwo = this.evaluateSmartyPHPHybridVariable(parts[3].trim());
                var res;
                switch(parts[2]){
                    case '==':
                    case 'eq':
                        res = (varOne == varTwo);
                        break;
                    case '!=':
                    case 'ne':
                        res = (varOne != varTwo);
                        break;
                    case '>':
                    case 'gt':
                        res = (varOne > varTwo);
                        break;
                    case '<':
                    case 'lt':
                        res = (varOne < varTwo);
                        break;
                    case '<=':
                    case 'le':
                        res = (varOne <= varTwo);
                        break;
                    case '>=':
                    case 'ge':
                        res = (varOne >= varTwo);
                        break;
                }
                return res;
            }else{
                var res;
                if( (expression - 0) == expression && expression.length > 0){ //isNumeric?
                    res = eval(expression);
                    res = res == 0;
                }else if(expression == 'true' || expression == 'false'){ //boolean
                    res = eval(expression);
                }else{
                    res = this.evaluateSmartyPHPHybridVariable(expression);
                    res = (res != null && res != undefined && res != '' && res != false);
                }
                return res;
            }
        }
    },
    evaluateSmartyPHPHybridExpression : function(variableName){ // this decodes a value that may be modified by functions using the '|' separator
        if(variableName === undefined) return null;
        var methods = variableName.splitHonoringQuotes('|', ['#']);
        methods.reverse();
        //console.log(['expression-methods:', methods]);
        var accessor = methods.pop();
        var value = this.evaluateSmartyPHPHybridVariable(accessor);
        //now that we have the value, we must run it through the function stack we found
        var method;
        var params;
        var old = value;
        methods.each(function(item, index){
            params = item.split(':');
            params.reverse();
            //console.log(['expression-item:', item]);
            method = params.pop(); //1st element is
            if(method == 'default'){
                if(!value || value == '') value = this.evaluateSmartyPHPHybridVariable(params[0]);
            }else{
                value = method.apply(this, params.clone().unshift(value));
            }
        });
        return value;
    },
    evaluateSmartyPHPHybridVariable : function(accessor, isConf){
        if(isConf == 'undefined' || isConf == null) isConf = false;
        if(!accessor) return '';
        if(string.startsWith(accessor.toLowerCase(), '\'') && string.endsWith(accessor.toLowerCase(), '\'')) return accessor.substr(1, accessor.length-2);
        if(string.startsWith(accessor.toLowerCase(), '"') && string.endsWith(accessor.toLowerCase(), '"')) return accessor.substr(1, accessor.length-2);
        if(string.startsWith(accessor.toLowerCase(), '$smarty.')) return this.get(accessor.substr(8));
        if(string.startsWith(accessor, '$')){
            var acc = accessor.substring(1);
            return this.get(acc);
        }
        if(string.startsWith(accessor, '#') && string.endsWith(accessor, '#')){
            var cnf = accessor.substr(1, accessor.length-2);
            return Midas.SmartyLib.evaluateSmartyPHPHybridVariable( cnf , true);
        }
        return this.get(accessor);
        var parts = accessor.split('.');
        parts.reverse();
        var currentPart = parts.pop();
        var currentValue;
        if(isConf){
            return this.getConf(accessor);
            //currentValue = smartyInstance.config[currentPart];
        }else switch(currentPart){
            case 'smarty':
                currentValue = this.data;
                break;
            default:
                currentValue = this.get(currentPart);
                if(currentValue == 'undefined' ) currentValue = '';
        }
        parts.each(function(item, index){
            if(!currentValue && currentValue !== 0) return;
            if(currentValue[item] == 'undefined'){
                currentValue = null;
            }else{
                currentValue = currentValue[item];
            }
        });
        return currentValue;
    }
});

Templates.Panel = new Class({
    Implements : [Emitter, Options],
    options : {
        type : 'Smarty',
        templateType : 'tpl',
        templateMode : 'panel',
        dataType : 'js',
        templateDirectory : false,
        dataDirectory : false,
        dataEndpoint : '/data',
        dataMode : 'local',
        wrapperSet : function(){}
    },
    delayed : [],
    template : null,
    name : null,
    dataCache : {},
    initialize : function(name, options){
        if(!Templates.load) Templates();
        this.name = name;
        if(type(options) == 'function') options = {onLoad:options};
        this.setOptions(options);
        if(!this.options.templateDirectory) this.options.templateDirectory = Templates.templateDirectory;
        if(!this.options.scriptDirectory) this.options.scriptDirectory = Templates.scriptDirectory;
        if(!options || !options.dataEndpoint) this.options.dataEndpoint += '/'+this.name;
        this.fetchTemplate(function(template){
            this.template = new Templates.Template[this.options.type](template, {wrapperSet:this.options.wrapperSet});
            this.template.name = this.name;
            this.template.setData = function(data){
                this.data = data;
            };
            var action;
            if(options && options.onLoad) options.onLoad(this);
            while(this.delayed.length > 0){
                action = this.delayed.pop();
                this.render(action.data, action.callback);
            }
        }.bind(this));
    },
    fetchData : function(callback, error){
        var fileName = this.options.scriptDirectory+'/'+this.name+'.controller.js';
        if(!callback) throw('OMG Sync!');
        //todo: cache non-existence
        if(this.dataCache[this.name]){
            //todo: handle out-of-date data
            callback(this.dataCache[this.name]);
        }else{
            Templates.load('.'+fileName, function(err, data){
                if(err){
                    if(error) error(err);
                    callback({});
                }else{
                    var renderer = new Templates.TemplateData();
                    eval(data);
                    //console.log('DD', renderer.data);
                    callback(renderer.data);
                }
            });
        }
    },
    fetch : function(file, callback, error){
        Templates.load('.'+file, function(err, data){
            if(err){
                if(error) error(err);
                else throw(err);
            }else{
                callback(data);
            }
        });
    },
    fetchTemplate : function(callback, error){
        var file = this.options.templateDirectory+'/'+this.name+'.'+this.options.templateMode+'.'+this.options.templateType;
        if(Templates.templateCache[file]) callback(Templates.templateCache[file]);
        else{
            this.fetch(file, function(data){
                Templates.templateCache[file] = data;
                callback(data);
            }, function(err){
                if(error) error(err);
                console.log('ERROR', err);
            });
        }
    },
    getData : function(){
    
    },
    render : function(data, callback){
        if(type(data) == 'function' && !callback){
            this.fetchData(function(fetchedData){
                this.render(fetchedData, data); 
            }.bind(this));
            return;
        }
        if(this.template){
            this.template.setData(data);
            this.template.render(data, callback);
        }else this.delayed.push({data:data,callback:callback});
    }
});

Templates.Panel.renderCounts = {};
Templates.Panel.count = function(panel){
    if(!Protolus.Panel.renderCounts[panel]) Protolus.Panel.renderCounts[panel] = 0;
    return Protolus.Panel.renderCounts[panel]++;
};
Templates.Panel.exists = function(panel, callback){
    var routedPanel = panel;
    routedPanel = Protolus.consumeGetParameters(routedPanel);
    var path = (Protolus.templateLocation+routedPanel+'.'+Protolus.panelExtension);
    if(Protolus.isNode){
        System.file.exists('.'+path, function(exists){
            if(callback) callback(exists);
        });
    }else{
        var result = path.existsAsURL();
        if(callback) callback(result);
    }
    //return result;
};
Templates.Panel.dataCache = {};
//perhaps something that should be static
Templates.Panel.date = function(timestamp, format){
    //todo: finish this mootools replacement
    //var result = format.replace(new RegExp('([A-Za-z])', 'g'), '%$1');
    //return (new Date(timestamp*1000)).format(result);
    var that = this,
        jsdate, f, formatChr = /\\?([a-z])/gi,
        formatChrCb,
        // Keep this here (works, but for code commented-out
        // below for file size reasons)
        //, tal= [],
        _pad = function (n, c) {
            if ((n = n + "").length < c) {
                return new Array((++c) - n.length).join("0") + n;
            } else {
                return n;
            }
        },
        txt_words = ["Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        txt_ordin = {
            1: "st",
            2: "nd",
            3: "rd",
            21: "st",
            22: "nd",
            23: "rd",
            31: "st"
        };
    formatChrCb = function (t, s) {
        return f[t] ? f[t]() : s;
    };
    f = {
        // Day
        d: function () { return _pad(f.j(), 2); },// Day of month w/leading 0; 01..31
        D: function () { return f.l().slice(0, 3); },// Shorthand day name; Mon...Sun
        j: function () { return jsdate.getDate(); },// Day of month; 1..31
        l: function () { return txt_words[f.w()] + 'day'; },// Full day name; Monday...Sunday
        N: function () { return f.w() || 7; },// ISO-8601 day of week; 1[Mon]..7[Sun]
        S: function () { return txt_ordin[f.j()] || 'th'; },// Ordinal suffix for day of month; st, nd, rd, th
        w: function () { return jsdate.getDay(); },// Day of week; 0[Sun]..6[Sat]
        z: function () { // Day of year; 0..365
            var a = new Date(f.Y(), f.n() - 1, f.j()),
                b = new Date(f.Y(), 0, 1);
            return Math.round((a - b) / 864e5) + 1;
        },

        // Week
        W: function () { // ISO-8601 week number
            var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3),
                b = new Date(a.getFullYear(), 0, 4);
            return 1 + Math.round((a - b) / 864e5 / 7);
        },

        // Month
        F: function () { return txt_words[6 + f.n()]; },// Full month name; January...December
        m: function () { return _pad(f.n(), 2); },// Month w/leading 0; 01...12
        M: function () { return f.F().slice(0, 3); },// Shorthand month name; Jan...Dec
        n: function () { return jsdate.getMonth() + 1; },// Month; 1...12
        t: function () { return (new Date(f.Y(), f.n(), 0)).getDate();},// Days in month; 28...31

        // Year
        L: function () { return new Date(f.Y(), 1, 29).getMonth() === 1 | 0; },// Is leap year?; 0 or 1
        o: function () { // ISO-8601 year
            var n = f.n(),
                W = f.W(),
                Y = f.Y();
            return Y + (n === 12 && W < 9 ? -1 : n === 1 && W > 9);
        },
        Y: function () { return jsdate.getFullYear(); },// Full year; e.g. 1980...2010
        y: function () { return (f.Y() + "").slice(-2); },// Last two digits of year; 00...99

        // Time
        a: function () { return jsdate.getHours() > 11 ? "pm" : "am"; },// am or pm
        A: function () { return f.a().toUpperCase(); },// AM or PM
        B: function () { // Swatch Internet time; 000..999
            var H = jsdate.getUTCHours() * 36e2,
                i = jsdate.getUTCMinutes() * 60,
                s = jsdate.getUTCSeconds(); // Seconds
            return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
        },
        g: function () { return f.G() % 12 || 12; },// 12-Hours; 1..12
        G: function () { return jsdate.getHours(); },// 24-Hours; 0..23
        h: function () { return _pad(f.g(), 2); },// 12-Hours w/leading 0; 01..12
        H: function () { return _pad(f.G(), 2); },// 24-Hours w/leading 0; 00..23
        i: function () { return _pad(jsdate.getMinutes(), 2); },// Minutes w/leading 0; 00..59
        s: function () { return _pad(jsdate.getSeconds(), 2); },// Seconds w/leading 0; 00..59
        u: function () { return _pad(jsdate.getMilliseconds() * 1000, 6); },// Microseconds; 000000-999000

        // Timezone
        e: function () { // Timezone identifier; e.g. Atlantic/Azores, ...
            // The following works, but requires inclusion of the very large
            // timezone_abbreviations_list() function.
//             return this.date_default_timezone_get();
            throw 'Not supported (see source code of date() for timezone on how to add support)';
        },
        I: function () { // DST observed?; 0 or 1
            // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
            // If they are not equal, then DST is observed.
            var a = new Date(f.Y(), 0),
                c = Date.UTC(f.Y(), 0),
                b = new Date(f.Y(), 6),
                d = Date.UTC(f.Y(), 6); // Jul 1 UTC
            return 0 + ((a - c) !== (b - d));
        },
        O: function () { var a = jsdate.getTimezoneOffset(); return (a > 0 ? "-" : "+") + _pad(Math.abs(a / 60 * 100), 4); },// Difference to GMT in hour format; e.g. +0200
        P: function () { // Difference to GMT w/colon; e.g. +02:00
            var O = f.O();
            return (O.substr(0, 3) + ":" + O.substr(3, 2));
        },
        T: function () { // Timezone abbreviation; e.g. EST, MDT, ...
            // The following works, but requires inclusion of the very
            // large timezone_abbreviations_list() function.
/*              var abbr = '', i = 0, os = 0, default = 0;
            if (!tal.length) {
                tal = that.timezone_abbreviations_list();
            }
            if (that.php_js && that.php_js.default_timezone) {
                default = that.php_js.default_timezone;
                for (abbr in tal) {
                    for (i=0; i < tal[abbr].length; i++) {
                        if (tal[abbr][i].timezone_id === default) {
                            return abbr.toUpperCase();
                        }
                    }
                }
            }
            for (abbr in tal) {
                for (i = 0; i < tal[abbr].length; i++) {
                    os = -jsdate.getTimezoneOffset() * 60;
                    if (tal[abbr][i].offset === os) {
                        return abbr.toUpperCase();
                    }
                }
            }
*/
            return 'UTC';
        },
        Z: function () { return -jsdate.getTimezoneOffset() * 60; },// Timezone offset in seconds (-43200...50400)

        // Full Date/Time
        c: function () { return 'Y-m-d\\Th:i:sP'.replace(formatChr, formatChrCb); },// ISO-8601 date.
        r: function () { return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb); },// RFC 2822
        U: function () { return jsdate.getTime() / 1000 | 0; }// Seconds since UNIX epoch
    };
    this.date = function (timestamp, format) {
       // console.log([format, timestamp]);
/*       if(!format.replace && timestamp.replace){// somehow, the args are swapped, todo: study this
        var swap = timestamp;
        timestamp = format;
        format = swap;
       }
  */    
        that = this;
        jsdate = ((typeof timestamp === 'undefined') ? new Date() : // Not provided
        (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
        new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
        );
        if(format == null) return "";
        var val= format.replace(formatChr, formatChrCb);
        
        return val;
    };
    // console.log([format, timestamp]);
    var val = this.date(timestamp, format);
    //console.log(val);
    return val; //*/
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
            //panel.template.ensureResources(options.resources, function(){ //preload passed resources
                panel.render(function(content){
                    if(!anchor.wrapper){
                        options.onSuccess(content);
                        return;
                    }
                    var wrapper = new Templates.Panel(anchor.wrapper, {
                        templateMode : 'wrapper'
                    });
                    var data = prime.clone(panel.template.data);
                    data.content = content;
                    
                    wrapper.render(data, function(wrappedContent){
                        options.onSuccess(wrappedContent);
                    });
                });
            //}, 'App/Resources');
        }
    });
};

Templates.insertTextAtTarget = function(text, target, html){
    var signature = '<!--['+target.toUpperCase()+']-->';
    return html.replace( signature, function(){ return text+signature } );
};
module.exports = Templates;