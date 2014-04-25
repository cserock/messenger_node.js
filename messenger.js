var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    url = require('url');
    
app.listen(process.env.PORT || 8888);

function handler(req, res){
	
	var query = require('url').parse(req.url,true).query;
	
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            data = data.toString('utf-8').replace('<%=host%>', req.headers.host);
            data = data.toString('utf-8').replace('<%=member_id%>', query.member_id);
            data = data.toString('utf-8').replace('<%=nickname%>', query.nickname);
            data = data.toString('utf-8').replace('<%=target_member_id%>', query.target_member_id);
            data = data.toString('utf-8').replace('<%=target_nickname%>', query.target_nickname);
            res.end(data);
        }
    );
};

// socket.io 셋팅
io.configure(function(){
    // io.set('transports', ['xhr-polling']);
    // io.set('polling duration', 10);
    io.set('log level', 2);
});

var socketListByMemberId = {};
var socketRoom = {};

io.sockets.on('connection', function(socket){
    
    // ready chat
    socket.on('readyChat', function(data){
    	console.log('readyChat : ' + data.member_id);
    	socketListByMemberId[data.member_id] = socket.id;
    });
    
    // request chat
    socket.on('requestChat', function(data){
    	
    	console.log('requestChat');
    	console.log(data);
    	
		var member_id = data.member_id;
		var target_member_id = data.target_member_id;
		
        // check room
        var rooms = io.sockets.manager.rooms;
        
        for (var key in rooms){
            if (key == ''){
                continue;
            }
            
            var roomKey = key.replace('/', '');
            
            var checkRoomKey = member_id + "_" + target_member_id;
            var checkReverseRoomKey = target_member_id + "_" + member_id;
            
            if((roomKey == checkRoomKey) || (roomKey == checkReverseRoomKey)){ 
            	console.log('joinChat');
            	console.log(roomKey);
            
            	socket.join(roomKey);
                io.sockets.in(roomKey).emit('completeMatch', {});
                socketRoom[socket.id] = roomKey;
                return;
            }
        }
        
        // make new room
        var newRoomKey = member_id + "_" + target_member_id;
        socket.join(newRoomKey);
        socketRoom[socket.id] = newRoomKey;
        
        // send invte message
        io.sockets.sockets[socketListByMemberId[target_member_id]].emit('invite',{ from_member_id : member_id});
    });
   
    // cancel request
    socket.on('cancelRequest', function(data){
        socket.leave(socketRoom[socket.id]);
    });
    
    // client -> server Message
    socket.on('sendMessage', function(data){
        console.log('sendMessage');
        io.sockets.in(socketRoom[socket.id]).emit('receiveMessage', data);
    });
    
    // disconnect
    socket.on('disconnect', function(data){
    	
        var key = socketRoom[socket.id];
        console.log('disconnect : ' + key);
    	
        socket.leave(key);
        io.sockets.in(key).emit('disconnect');
        var clients = io.sockets.clients(key);
        for (var i = 0; i < clients.length; i++){
            clients[i].leave(key);
        }
    });
});
