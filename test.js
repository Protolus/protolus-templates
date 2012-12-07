var should = require("should");
var request = require('request');
var http = require('http');
var port = 221;
var resource = require('./protolus-resource');
describe('ProtolusResource', function(){
    describe('Simple \'test-component\' tests', function(){
        var server;
        var running = false;
        before(function(done){
            try{
                server = http.createServer(function(req, res) {
                    resource.handleResourceCalls(req, res, function(){
                        //serve a page
                    });
                }).listen(port);
                server.on("listening", function() {
                    running = true;
                    done();
                });
            }catch(ex){
                should.not.exist(ex);
            }
        });
        
        it('Server Runs', function(){
            should.equal(running, true);
        });
        
        it('Should perform simple, macroless render');
        
        after(function(done) {
            server.close();
            done();
        });
    });
});