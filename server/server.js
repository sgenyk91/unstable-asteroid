//get the dependencies
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var messageController = require('./messages/messageController');
var clearURL = '/storm.html/clear';

//serve static files
app.use(express.static(__dirname + '/../client') );
app.use(express.static(__dirname + '/../client/styles') );
app.use('/docs', express.static(__dirname + '/../docs')  )

//redirect blank url to index.html
app.get('/', function(req, res) {
  res.render('index');
});

//clear database when '/storm.html/clear' is visited
app.get(clearURL, function(req, res) {
  messageController.clearDB(req, res);
});

//open a socket between the client and server
io.on('connection', function(socket) {
  var sendFullMessageTree = function() {
    messageController.getFullMessageTree(function(messages) {
      io.emit('all messages', messages);
    });
  };

  //send all current messages to only the newly connected user
  messageController.getFullMessageTree(function(messages) {
    socket.emit('all messages', messages);
  });

  //send all current messages to all users when a new message has been added
  socket.on('new message', function(msg) {
    messageController.addNewMessage(msg, function() {
      sendFullMessageTree();
    });
  });

  //send all current messages to all users after a message has been edited
  socket.on('edit message',function(msg){
    messageController.editMessage(msg,function(){
      sendFullMessageTree();
    })
  });

  //send all current messages to all users after a message has been removed
  socket.on('remove message leaf',function(msg){
    messageController.removeMessage(msg,function(){
      sendFullMessageTree();
    });
  });


  //Lobby socket stuff
  socket.on('new room',function(lobbyObj, userObj){
    lobbyController.addNewLobby(lobbyObj, userObj, function(isTaken){
      console.log('addNewLobby');
      //emit back to client
      if (isTaken) {
        console.log('Lobby Name Taken: ' + lobbyObj.name);
        socket.emit('lobby taken');
      }
      else {
        socket.emit('created lobby', lobbyObj);
      }
    });
  });
  socket.on('enter lobby', function(lobbyName, lobbyPass){
    lobbyController.enterLobby(lobbyName, lobbyPass, function(isAuthentic){
      if(isAuthentic) {
        socket.emit('entered lobby', lobbyObj);
      }
      else {
        socket.emit('wrong lobby password');
      }
    });
  });

  /* User socket stuff */
  //Sign-up
  socket.on('user sign up',function(userObj){
    userController.addNewUser(userObj,function(isTaken){
      console.log('addNewUser');
      //emit back to client
      if (isTaken) {
        console.log('Username taken: ' + userObj.name);
        socket.emit('user taken');
      }
      else {
        socket.emit('created user', userObj);
      }
    });
  });
  //Login
  socket.on('user login', function(userName, userPass){
    userController.Login(userName, userPass, function(isAuthentic){
      if(isAuthentic) {
        socket.emit('logged in', userObj);
      }
      else {
        socket.emit('wrong user password');
      }
    });
  });
});

//start listening
var port = process.env.PORT || 8000;
http.listen(port);
