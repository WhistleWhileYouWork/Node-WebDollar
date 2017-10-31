import { Observable, Subscribable } from 'rxjs/Observable';

import {NodeProtocol} from './protocol/node-protocol';
import {NodePropagationProtocol} from './protocol/node-propagation-protocol';
import {NodeSignalingServerProtocol} from './protocol/signaling/node-signaling-server-protocol';
import {NodeSignalingClientProtocol} from './protocol/signaling/node-signaling-client-protocol';
import {NodesList} from '../../node/lists/nodes-list.js';
import {SocketAddress} from './socket-address';

// Extending Socket / Simple Peer

class SocketExtend{

    extendSocket(socket, address, port){

        socket.node = {};

        socket.node.getSocket = () => { return socket};

        socket.node.on = (name, callback ) => { socket.on(name, callback) } ;
        socket.node.sckAddress = SocketAddress.createSocketAddress(address, port);

        socket.node.sendRequest = (request, requestData) => { return this.sendRequest(socket, request, requestData) };
        socket.node.sendRequestWaitOnce = (request, requestData, answerPrefix) => {return this.sendRequestWaitOnce(socket, request, requestData, answerPrefix) };
        socket.node.broadcastRequest = (request, data, type) => { return this.broadcastRequest(socket, request, data, type) };

        socket.node.protocol = {};
        socket.node.protocol.helloValidated = false;
        socket.node.protocol.sendHello = () => { return NodeProtocol.sendHello(socket.node)  };

        socket.node.protocol.propagation = {};
        socket.node.protocol.propagation.initializePropagation = () => { return NodePropagationProtocol.initializeSocketForPropagation(socket.node) };

        socket.node.protocol.signaling = {};
        socket.node.protocol.signaling.server = {};
        socket.node.protocol.signaling.client = {};
        socket.node.protocol.signaling.server.initializeSignalingServerService = () => { return NodeSignalingServerProtocol.initializeSignalingServerService(socket) };
        socket.node.protocol.signaling.server.initializeSignalingClientService = () => { return NodeSignalingClientProtocol.initializeSignalingClientService(socket) };
    }

    sendRequest (socket, request, requestData) {

        //console.log("sendRequest ############### ", socket, request, requestData);

        if (typeof socket.emit === 'function')  return socket.emit( request, requestData ); //socket io
        else
        if (typeof socket.send === 'function')  return socket.send( request, requestData ); // socket
        else
        if (typeof socket.signal === 'function') { //webrtc peer
            try{
                requestData = JSON.parse(requestData);

            } catch (Exception){
                console.log("ERROR! Couldn't convert JSON data ", requestData)
            }
            return socket.signal( request, requestData )
        }

        console.log("ERROR!! Couldn't sendRequest ", socket, request, requestData);

    }


    /*
        Sending the Request and return the Promise to Wait Async
    */

    sendRequestWaitOnce (socket, request, requestData, answerPrefix) {

        if (typeof answerPrefix === 'undefined') request += '/'+answerPrefix;

        return new Promise((resolve) => {

            this.sendRequest(socket, request, requestData);

            socket.once(request, function (resData) {
                resolve(resData);
            });
        });
    }


    broadcastRequest (socket, request, data, type){

        let nodes = NodesList.getNodes(type);

        for (let i=0; i < nodes.length; i++)
            if (nodes[i].socket !== socket)
                this.sendRequest(nodes[i].socket, request, data);

    }


}


exports.SocketExtend = new SocketExtend();


