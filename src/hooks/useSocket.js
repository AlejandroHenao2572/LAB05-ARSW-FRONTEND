import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';


const useSocket = (onMessageReceived) => {

  const clientRef = useRef(null);

  useEffect(() => {
    //Create a new STOMP client 
    //Every time the component mounts, we create a new STOMP client and connect to the server.
    const stompClient = new Client({

      // Conection to the WebSocket endpoint provided by the Spring Boot server  
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-board'),
      reconnectDelay: 5000,

      onConnect: () => {
        console.log('Conecting to STOMP broker...');

        // Subscribe to the topic where the server will send drawing updates
        stompClient.subscribe('/topic/board', (stompMessage) => {

          const drawMessage = JSON.parse(stompMessage.body);

          //Delegate the received message to the provided callback function
          onMessageReceived(drawMessage);
        });
      },

      onDisconnect: () => {
        console.log('Disconnecting from STOMP broker...');
      },
    });

    // Activate the STOMP client to establish the connection
    stompClient.activate();

    // Store the client instance in the ref for later use 
    clientRef.current = stompClient;

    return () => {
      stompClient.deactivate();
      console.log('STOMP connection deactivated');
    };

  }, []); 


  /** 
   * sendMessage: Function to send a drawing message to the server.
   * This function checks if the client is connected before attempting to send a message. 
   * If the connection is active, it publishes the message to the '/app/draw' endpoint, which the server listens to for drawing updates.
   * The message is sent as a JSON string containing the drawing data (e.g., coordinates, color).
  */
  const sendMessage = (drawMessage) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: '/app/draw',
        body: JSON.stringify(drawMessage),
      });
    } else {
      console.warn('Failed to send message: STOMP client is not connected.');
    }
  };

  return { sendMessage };
};

export default useSocket;