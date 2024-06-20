fetch('https://99223496-fec8-46d8-85b1-bd730fbbf802.pushnotifications.pusher.com/publish_api/v1/instances/99223496-fec8-46d8-85b1-bd730fbbf802/publishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 7E56D0CAD5A786EE1B38A976667989050745E2661653495EC5EBD8BE360A5A20'
    },
    body: JSON.stringify({
      'interests': [
        'hello'
      ],
      'web': {
        'notification': {
        'title': 'MEETINGS',
        'body': '10:00 AM - 11:00 AM meeting with Mr.Sandip from Booksmart',
        }
      }
    })
  });