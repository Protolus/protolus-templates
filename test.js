var should = require("should");

describe('ProtolusResource', function(){
    describe('Panel tests', function(){
        var Templates = require('./protolus-templates');
        before(function(){
            Templates({ templateDirectory : '/Panels' });
        });
        
        it('Basic render', function(done){
            new Templates.Panel('simple', function(panel){
                panel.render({} , function(html){
                    html.indexOf('OMG').should.not.equal(-1);
                    done();
                });
            });
        });
        
        it('Basic if', function(done){
            /*new Templates.Panel('foreach', function(panel){
                var data = {
                    test : 'blah'
                };
                panel.render(data , function(html){
                    html.indexOf('YES').should.not.equal(-1);
                    done();
                });
            });*/
        });
        
        it('Basic foreach', function(done){
            new Templates.Panel('foreach', function(panel){
                var data = {
                    test : 'blah',
                    list : [
                        'foo',
                        'bar',
                        'baz'
                    ]
                };
                panel.render(data , function(html){
                    html.indexOf('<h2>'+data.test+'</h2>').should.not.equal(-1);
                    data.list.forEach(function(value, key){
                        html.indexOf('<a>'+key+'</a>').should.not.equal(-1);
                        html.indexOf('<b>'+value+'</b>').should.not.equal(-1);
                    });
                    done();
                });
            });
        });
        
    });
});