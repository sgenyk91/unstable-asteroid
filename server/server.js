//get the dependencies
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var messageController = require('./messages/messageController');
var userController = require('./users/userController');
var roomController = require('./rooms/roomController');
var clearURL = '/storm.html/clear';

//serve static files
app.use(express.static(__dirname + '/../client') );
app.use(express.static(__dirname + '/../client/styles') );
app.use('/docs', express.static(__dirname + '/../docs')  );

//redirect blank url to index.html
app.get('/', function(req, res) {
  res.render('index');
});

//clear database when '/storm.html/clear' is visited
app.get(clearURL, function(req, res) {
  messageController.clearDB(req, res);
});

/**
  HACKY BULLSHIT
*/
var THEROOM;



//open a socket between the client and server
io.on('connection', function(socket) {
  var sendFullMessageTree = function(roomID) {
    messageController.getFullMessageTree(roomID, function(messages) {
      io.emit('all messages', messages);
    });
  };

  //send all current messages to only the newly connected user
  // messageController.getFullMessageTree(roomObj, function(messages) {
  //   socket.emit('all messages', messages);
  // });

  //send all current messages to all users when a new message has been added
  socket.on('new message', function(msg) {
    messageController.addNewMessage(msg, function() {
      sendFullMessageTree(msg.roomID);
    });
  });

  //send all current messages to all users after a message has been edited
  socket.on('edit message',function(msg){
    messageController.editMessage(msg,function(){
      sendFullMessageTree(msg.roomID);
    });
  });

  //send all current messages to room after a message has had a file attached
  socket.on('add file', function(msg) {
    messageController.addFileToMessage(msg, function(){
      sendFullMessageTree(msg.roomID);
    });
  });

  //send all current messages to all users after a message has been removed
  socket.on('remove message leaf',function(msg){
    messageController.removeMessage(msg,function(){
      sendFullMessageTree(msg.roomID);
    });
  });


  /* room socket stuff */
  //Create room
  socket.on('new room',function(roomObj, userObj){
    roomController.addNewRoom(roomObj, userObj, function(isTaken){
      console.log('addNewRoom');
      //emit back to client
      if (isTaken) {
        console.log('room Name Taken: ' + roomObj.name);
        socket.emit('room taken', true);
      }
      else {
        console.log("NEW ROOM");
        socket.emit('created room', roomObj);
      }
    });
  });
  //Enter room
  socket.on('enter room', function(roomName, roomPass, userObj){
    roomController.enterRoom(roomName, roomPass, userObj, function(isAuthentic, roomObj){
      if(isAuthentic) {
        

        //HACKY BULLSHIT
        THEROOM = roomObj;




        //redirect to storm.html aka app.js
        socket.emit('entered room', roomObj);
        // sendFullMessageTree(roomObj._id);
      }
      else {
        socket.emit('wrong room password', true);
      }
    });
  });
  socket.on('redirect to storm', function(){
    socket.emit('redirected to storm', THEROOM);

    sendFullMessageTree(THEROOM._id);
  });
  //Exit
  socket.on('exit room', function(roomObj, userName){
    roomController.exitRoom(roomObj, userName, function(room){
      socket.emit('exited room', room);
    });
  }); 

  /* User socket stuff */
  //Sign-up
  socket.on('user sign up',function(userObj){
    userController.addNewUser(userObj,function(isTaken){
      if (isTaken) {
        socket.emit('user taken', true);
      }
      else {
        roomController.getAllRooms(function(rooms){
          console.log("USER SIGNED UP", rooms);
          socket.emit('created user', rooms);
        });
      }
    });
  });
  //Login
  socket.on('user login', function(userObj){
    userController.login(userObj, function(isAuthentic){
      if(isAuthentic) {
        roomController.getAllRooms(function(rooms){
          console.log("USER LOGGED IN");
          socket.emit('logged in', rooms);
        });
      }
      else {
        socket.emit('wrong user password', true);
        console.log('WRONG USER PASSWORD'); 
      }
    });
  });
});

//start listening
var port = process.env.PORT || 8000;
http.listen(port, function() {
  console.log("Listening to port 8000");
});
