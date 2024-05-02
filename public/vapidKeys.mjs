import webpush from 'web-push';
const vapidKeys = webpush.generateVAPIDKeys();

// Prints 2 URL Safe Base64 Encoded Strings
console.log(vapidKeys);

// results

// {
//     publicKey: 'BBoQxdK2jaBHVraazx5rc9-9LjQIqKXC_viyGjQH9iLbdFDbUvQBl-MPMMqUFu-nhxe0TVwcusaR1MUJqxLIc3Q',
//     privateKey: 'sVQhQTIiuL6R_3bbkYt1JIOyRYszQs_Ie8C9VtnBhOs'
//   }