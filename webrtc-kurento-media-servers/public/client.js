let divRoomSelection = document.getElementById('roomSelection')
let divMeetingRoom = document.getElementById('meetingRoom')
let inputRoom = document.getElementById('room')
let inputName = document.getElementById('name')
let btnRegister = document.getElementById('register')

//variables 
let roomName
let userName
let participants = {}

let socket = io()

btnRegister.onclick = () => {
    roomName = inputRoom.value
    userName = inputName.value

    if (roomName === '' || userName === '') {
        alert('Room and name are required')
    } else {
        let message = {
            event: 'joinRoom',
            userName: userName,
            roomName: roomName
        }

        sendMessage(message)
        divRoomSelection.style = "display:none"
        divMeetingRoom.style = "display: block"
    }
}

socket.on('message', message => {
    console.log('Message arrived', message.event)

    switch (message.event) {
        case 'newParticipantArrived':
            receiveVideo(message.userid, message.userName)
            break
        case 'existingParticipants':
            onExistingParticipants(message.userid, message.existingUsers)
            break
        case 'receiveVideoAnswer':
            onReceveVideoAnswer(mesage.sender.id, message.sdpAnswer)
            break
        case 'candidate':
            addIceCandidate(message.userid, message.candidate)
            break
    }
})

function sendMessage(message) {
    socket.emit('message', message)
}

function receiveVideo(userid, username) {
    let video = document.createElement('video')
    let div = document.createElement('div')
    div.className = 'videoContainer'
    let name = document.createElement('div')
    video.id = userid
    video.autoplay = true
    name.appendChild(document.createTextNode(username))
    div.appendChild(video)
    div.appendChild(name)
    divMeetingRoom.appendChild(div)

    let user = {
        id: userid,
        username: username,
        video: video,
        rtcPeer: null,
    }
    participants[user.id] = user

    let options = {
        remoteVideo: video,
        onicecandidate: onIceCandidate
    }

    user.rtcPeer = KurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (err) {
        if (err) {
            return console.error(err)
        }
        this.generateOffer(onOffer)

    })

    let onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onExistingParticipants(userid, existingUsers) {
    var video = document.createElement('video');
    var div = document.createElement('div');
    div.className = "videoContainer";
    var name = document.createElement('div');
    video.id = userid;
    video.autoplay = true;
    name.appendChild(document.createTextNode(userName));
    div.appendChild(video);
    div.appendChild(name);
    divMeetingRoom.appendChild(div);

    var user = {
        id: userid,
        username: userName,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var constraints = {
        audio: true,
        video: {
            mandatory: {
                maxWidth: 320,
                maxFrameRate: 15,
                minFrameRate: 15
            }
        }
    };

    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: onIceCandidate
    }

    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer)
        }
    );

    existingUsers.forEach(function (element) {
        receiveVideo(element.id, element.name);
    });

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onReceiveVideoAnswer(senderid, sdpAnswer) {
    participants[senderid].rtcPeer.processAnswer(sdpAnswer);
}

function addIceCandidate(userid, candidate) {
    participants[userid].rtcPeer.addIceCandidate(candidate);
}

// utilities
function sendMessage(message) {
    console.log('sending ' + message.event + ' message to server');
    socket.emit('message', message);
}