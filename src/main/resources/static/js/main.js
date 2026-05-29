'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');

var stompClient = null;
var username = null;

var typingTimeout = null;
var typingUsers = new Set();

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];


// ===================== CONNECT =====================
function connect(event) {
    username = document.querySelector('#name').value.trim();

    if (username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }

    event.preventDefault();
}


// ===================== ON CONNECTED =====================
function onConnected() {

    stompClient.subscribe('/topic/public', onMessageReceived);

    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({ sender: username, type: 'JOIN' })
    );

    connectingElement.classList.add('hidden');
}


// ===================== ERROR =====================
function onError(error) {
    connectingElement.textContent =
        'Could not connect to WebSocket server. Please refresh!';
    connectingElement.style.color = 'red';
}


// ===================== SEND MESSAGE =====================
function sendMessage(event) {
    var messageContent = messageInput.value.trim();

    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }

    event.preventDefault();
}


// ===================== TYPING =====================
function sendTyping() {
    if (stompClient && username) {
        stompClient.send("/app/chat.typing", {}, JSON.stringify({
            sender: username,
            type: 'TYPING'
        }));
    }
}


// typing listener (IMPORTANT FIXED)
messageInput.addEventListener("input", function () {
    sendTyping();

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        // auto stop indicator locally (no backend needed)
        typingUsers.delete(username);
        updateTypingUI();
    }, 1500);
});


// ===================== MESSAGE RECEIVED =====================
function onMessageReceived(payload) {

    var message = JSON.parse(payload.body);

    // create typing UI once
    var typingIndicator = document.querySelector("#typingIndicator");

    if (!typingIndicator) {
        typingIndicator = document.createElement("div");
        typingIndicator.id = "typingIndicator";
        typingIndicator.style.padding = "5px";
        typingIndicator.style.fontStyle = "italic";
        messageArea.parentNode.insertBefore(typingIndicator, messageArea);
    }


    // ===================== TYPING EVENT =====================
    if (message.type === 'TYPING') {

        if (message.sender !== username) {
            typingUsers.add(message.sender);
        }

        updateTypingUI();
        return;
    }


    // remove from typing when actual message arrives
    typingUsers.delete(message.sender);
    updateTypingUI();


    // ===================== CHAT UI =====================
    var messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    }
    else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    }
    else {
        messageElement.classList.add('chat-message');

        var avatarElement = document.createElement('i');
        avatarElement.appendChild(document.createTextNode(message.sender[0]));
        avatarElement.style['background-color'] = getAvatarColor(message.sender);

        messageElement.appendChild(avatarElement);

        var usernameElement = document.createElement('span');
        usernameElement.appendChild(document.createTextNode(message.sender));
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    textElement.appendChild(document.createTextNode(message.content));

    messageElement.appendChild(textElement);

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}


// ===================== TYPING UI =====================
function updateTypingUI() {
    var typingIndicator = document.querySelector("#typingIndicator");

    if (!typingIndicator) return;

    if (typingUsers.size === 0) {
        typingIndicator.innerHTML = "";
    } else {
        typingIndicator.innerHTML =
            Array.from(typingUsers).join(", ") + " is typing...";
    }
}


// ===================== AVATAR COLOR =====================
function getAvatarColor(messageSender) {
    var hash = 0;

    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }

    var index = Math.abs(hash % colors.length);
    return colors[index];
}


// ===================== EVENTS =====================
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);