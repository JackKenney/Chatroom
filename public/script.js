/*
CLIENT SIDE SCRIPTS:
Author: Jack Kenney
jQuery and Socket.IO front-end interactions
*/
// Connect to server
var socket = io('/');

$(document).ready( function() {
//global client variables
var numUsers = 0,
    username = '',
    firstname = '',
    lastname = '',
    fullname = '',
    email = '',
    loggedIn = false,
    latestName = '',
    connected = false,
    loginPage = $(document.getElementById('login')),
    regPage = $(document.getElementById('register')),
    chatPage = $(document.getElementById('chat')),
    userCount = $(document.getElementById('userCount')),
    chatArea = $(document.getElementById('chatArea')),
    messageInput = $(document.getElementById('messageInput')),
    isMobile = false,
    staying = false,
    cookies = {},
    guest = false;
//cookies

function createCookies(name,value,hours) {
  var date = new Date();
  date.setTime(date.getTime()+(1000*60*60*(hours ? hours : 1)));
  var expires = "; expires = "+date.toGMTString();
  value = username;
  document.cookie = name + " = " + value + ";" + expires + "; path=/";
}
function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  	}
	return null;
}
function checkCookies() {
  var x = readCookie('username');
  if(x!==null) {
    /*var start = x.indexOf("username = ") + 10,
        end = start + x.substring(start).indexOf(";"),
        usern = x.substring(start,end);*/
    return x;
  }
  else return false;
}
function destroyCookies() {
  createCookies("username","",-1);
  readCookie("username");
}

// Mobile accomodations:
	
/*if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) { 
	//tests if device is a hand held and creates boolean isMobile  (true if mobile, else false)
	isMobile = true;
}

//if(isMobile){ $("body").width($(window).width()); } //if mobile, shrink website
*/


// Socket handlers for incoming server emissions:
//handler for initial connection information
socket.on('connected', function(data) { //{ 'numUsers':numUsers }
  updateUC(data.numUsers);
  connected = true;
  log({ message:"Welcome!", type:3 } );
  if (checkCookies()!==false) {
    var u = checkCookies();
    socket.emit('cookie', { username:u });
  }
});

//any incoming system message (login,logout,namechange)
socket.on('sysMessage', function(data) { //{ username, type, [numUsers], [submit] }
  if(data.type===1)  {
    var mess = data.username + " has joined the chatroom!";
    log({ message:mess, type:3 });
  }
  else if (data.type===2) {
    var mess = data.username + " has left the chatroom.";
    log({ message:mess, type:3 });
  }
  updateUC(data.numUsers);
});

//any incoming message from another user
socket.on('otherMessage', function(data) { //{ username, message, fullname }
  if(data.username!==username) {
    log({ message:data.message, type:2, username:data.username, fullname:data.fullname });
  }
  else {
    log({ message:data.message, type:1 });
  }
});

//server response to login request
socket.on('loginResponse', function(data) { //{ results(object), type, numUsers }
  //type 1 = conf, 2 = uname not found || passwords don't match
  if(data.type == 1) {
    updateUC(data.numUsers);
    username = data.results.username;
    firstname = data.results.firstname;
    lastname = data.results.lastname;
    fullname = data.results.firstname + " " + data.results.lastname;
    email = data.results.email;
    if(data.stay) createCookies("username",username,1);
    loggedIn = true;
    loginPage.css('display','none');
    chatPage.css('display','block');
    exitMes(true,fullname);
  }
  else {
    $('#loginError').css('display','block');
  }
  $('#loginPassword').val('');
});

//server response to registration
socket.on('registerResponse', function(data) { // { firstname, type, numUsers }
  if(data.type === 1) {
    regPage.css('display','none');
    loginPage.css('display','block');
    var w = $(document.createElement('h4')),
        t = $(document.createTextNode('Welcome, ' + data.firstname + '!'));
    w.append(t);
    loginPage.prepend(w);
  }
  else {
    $('#regTakenError').css('display','block');
  }
});

socket.on('guestConf', function(data) { // { username, numUsers }
  guest = true;
  loggedIn = true;
  username = data.username;
  email = '';
  firstname = '';
  lastname = '';
  fullname = data.username;
  updateUC(data.numUsers);
  $('#logout').css('display','none');
  exitMes(false); 

  loginPage.css('display','none');
  chatPage.css('display','block');
});

//:End handlers for server emissions

// Necessary functions:
  var exitMes = function(type,name) {
    //type true = reg logout
    if(type) {
      var first = document.createTextNode(", "),
            last = document.createTextNode('?');
      var a = $(document.createElement('a')),
            atext = document.createTextNode('logout');
      a.append(atext);
      a.attr("id","logoutLink");
      $('#logout').empty().prepend(first).append(a).append(last);
      $('#logout').prepend(name);
      $('#logout').css('display','block');
      $('#logoutLink').click(function() {
        socket.emit('logout',{ 'username':username });
        chatPage.css('display','none');
        loginPage.css('display','block');
        destroyCookies();
        $('.log').remove();
        $('.message').remove(); 
        $('.name').remove();
        $('#logout').empty();
        $('#logoutLink').remove();
      });
    }
    //type false = friend
    else {
      $('#regTextLink').remove();
      var wrap = document.createElement('p'),
          link = document.createElement('a'),
          text = document.createTextNode('Welcome, friend! '),
          linkText = document.createTextNode('Register'),
          end = document.createTextNode('?');
      $(wrap).append(text);
      $(wrap).attr('id','regTextLink');
      $(link).append(linkText);
      $(wrap).append(link);
      $(wrap).append(end);
      chatPage.prepend(wrap);

      $(link).click(function() {
        chatPage.css('display','none');
        regPage.css('display','block');
        $('#regTextLink').empty();
        socket.emit('guestOut', { 'username':username } );
        $('.log').remove();
        $('.message').remove();
        $('.name').remove();
      });
    }
  }
  var updateUC = function(nu) {
    if(nu !== undefined) {
        numUsers = nu;
        userCount.empty();
        var text = document.createTextNode(nu + ' User' + (nu!==1 ? 's' : '') ); //account for plural (yes:no)
        userCount.append(text);
    }
  }
  var scroll = function() {
    chatArea.scrollTop(chatArea[0].scrollHeight); //try this, may not work?
    //$('#messages').scrollTop($('#messages')[0].scrollHeight);
  }
  var unfade = function() {
    //make other parts of screen unfade
    chatArea.css('opacity','1.0');
    $('#uInput').css('opacity','1.0');

    //make set button and input glow
    $('#unameDiv').removeClass('glow');
  }
  var showError = function() {
    $('#nameError').css('display','inline-block');
  }
  var log = function(data) { //data is { message, [type], [user], [fullname] }
    // a message from me
    if (data.type===1) {
      var mess = $(document.createElement('li')),
          mText = $(document.createTextNode(data.message)),
          br = document.createElement('br');

      if(latestName!==username) {
        var name = $(document.createElement('li')),
            nText = $(document.createTextNode(fullname));
        name.addClass('name my');
        name.append(nText);
        chatArea.append(name);
        chatArea.append(br);
        latestName = username;
      }
      mess.addClass('myMessages message');
      mess.append(mText);
      chatArea.append(mess);
      chatArea.append(br);  
    }
    // any other user's message

    else if (data.type===2) {
      var mess = $(document.createElement('li')),
          mText = $(document.createTextNode(data.message)),
          br = document.createElement('br');

      if(latestName!==data.username) {
        name = $(document.createElement('li'));
        nText = $(document.createTextNode(data.fullname));
        name.addClass('name other');
        name.append(nText);
        chatArea.append(name);
        chatArea.append(br);
        latestName = data.username;
      }
      mess.addClass('otherMessages message');
      chatArea.append(mess);
      mess.append(mText);
      chatArea.append(br);
    }
    // any other system message
    else {
      var mess = $(document.createElement('li')),
          mText = $(document.createTextNode(data.message)),
          br = document.createElement('br');
      mess.addClass('log');
      chatArea.append(mess);
      mess.append(mText);
      chatArea.append(br);
      latestName = '';
    }
    scroll();
  } //end of log function
  var cleanUsername = function(input) {  //returns boolean
    var result = $('<div/>').text(input).html() || input;
    if(result.indexOf(' ') !== -1) {
      return false;
    }
    else return result.toString();
  }
  var hideErrors = function() {
    $('#loginError').css('display','none');
    $('#regFieldError').css('display','none');
    $('#regTakenError').css('display','none');
    $('#regPassError').css('display','none');
  }
  var registerCheck = function() {
    hideErrors();
    var username = $('#regUsername').val().trim(),
        firstname = $('#regFirstName').val().trim(),
        lastname = $('#regLastName').val().trim(),
        email = $('#regEmail').val().trim(),
        password = CryptoJS.SHA256($('#regPassword').val().trim()).toString(),
        confPassword = CryptoJS.SHA256($('#confPassword').val().trim()).toString();
    $('#regPassword').val('');
    $('#confPassword').val('');
    if (
       firstname == "" ||
       lastname == "" ||
       username == "" ||
       email == "" ||
       password == "" ||
       confPassword == "" ||
       !cleanUsername(username) ||
       email.indexOf('@') === -1
    ) { $('#regFieldError').css('display','block'); }
    else if ( password !== confPassword ) {
      $('#regPassError').css('display','block');
    }
    else {
      socket.emit('register', { 'username':username, 'firstname':firstname, 'lastname':lastname, 'email':email, 'password':password } );
    }
  }
  var loginCheck = function() {
    hideErrors();
    var username = $('#loginUsername').val().trim(),
        password = CryptoJS.SHA256($('#loginPassword').val().trim()).toString(),
        stay = $('#stayLoggedIn').is(":checked");
    $('#loginPassword').val("");
    if( username !== "" && password !== "" ) {
      socket.emit('login', { 'username':username, 'password':password, 'stay':stay });
    }
    else {
      $('#loginError').css('display','block');
    }
  }
  var sendMessage = function() {
    var mess = messageInput.val().trim();
    //may need clean message input?
    socket.emit('newMessage', { 'username':username, 'fullname':fullname, message:mess });
    log( {message:mess, type:1 } );
    messageInput.val("");
  }

// :End Necessary Functions

// Page Functionality:
  $(window).keydown(function (event) {
    if(loginPage.css('display')==='block'){
      if (event.which === 13) {
        loginCheck();
      }
    }
    else if(chatPage.css('display')==='block' && loggedIn && messageInput.is(":focus") && messageInput.val()!=="") {
      if (event.which === 13) {
        sendMessage();
      }
    }
    else if(regPage.css('display')==='block') {
      if (event.which === 13) {
        registerCheck();
      }
    }
  });

  messageInput.click(function () {
    messageInput.focus();
  });
  chatArea.click(function() {
    messageInput.focus();
  });
  $('#regLinkButton').click(function() {
    loginPage.css('display','none');
    regPage.css('display','block');
  });
  $('#loginLinkButton').click(function() {
    regPage.css('display','none');
    loginPage.css('display','block');
  });
  $('#loginButton').click(function() {
    loginCheck();
  });
  $('#regButton').click(function() {
    registerCheck();
  });
  $('#guestButton').click(function() {
    socket.emit('guest');
  });
  $('#regTextLink').click(function() {
    chatPage.css('display','none');
    regPage.css('display','block');
    var first = document.createTextNode(", "),
        last = document.createTextNode('?');
    var a = $(document.createElement('a')),
        atext = document.createTextNode('logout');
    a.append(atext);
    $('#logout').empty().prepend(first).append(a).append(last);
  });
  $('#logout a').click(function() {
    chatPage.css('display','none');
    loginPage.css('display','block');
    var first = document.createTextNode(", "),
        last = document.createTextNode('?');
    var a = $(document.createElement('a')),
        atext = document.createTextNode('logout');
    a.append(atext);
    $('#logout').empty().prepend(first).append(a).append(last);
  });

// :End Page Functionality

}); //end document ready
