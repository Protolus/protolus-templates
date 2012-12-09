var Templates = require('./protolus-templates');

/*var app = require('http').createServer(function handler(req, res) {
    Templates({
        templateDirectory : 'Panels'
    });
    new Templates.Panel('test', function(panel){
        console.log('READY');
        panel.render({}, function(html){
            res.end(html);
        });
    });
});
app.listen(80);*/

Templates({
    templateDirectory : '/Panels',
    scriptDirectory : '/Scripts'
});
Templates.renderPanel('page', function(html){
    console.log('html', html);
});

//var request = require('request');

/*request('http://localhost/js/test-component', function (error, response, body) {
    var check = require('syntax-error');
    if (!error && response.statusCode == 200) {
        var err = check(body);
        if(err) throw('OMG, Error!')
        else console.log('No Errors!');
    }
});*/