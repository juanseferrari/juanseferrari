// Requires
const path = require("path");


const mainController = {
  home: (req, res) => {
    // Send HTML response with Open Graph meta tags
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:title" content="Juanse Ferrari">
        <meta property="og:description" content="Description">
        <meta property="og:image" content="https://www.juanseferrari.com/juanse1.jpg">

        <!-- Add more meta tags as needed -->
        <title>Juanse Ferrari's Linktree</title>
      </head>
      <body>
        <!-- Your HTML content goes here -->

        <script>
          // Redirect to the desired URL after a delay (e.g., 3 seconds)
          setTimeout(function() {
            window.location.href = 'https://linktr.ee/juanseferrari';
          }, 300);
        </script>
      </body>
      </html>
    `);
  },

  trabajo: (req, res) => {
    // Send HTML response with Open Graph meta tags
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta property="og:title" content="Juanse Ferrari">
        <meta property="og:description" content="Description">
        <meta property="og:image" content="https://www.juanseferrari.com/juanse1.jpg">

        <!-- Add more meta tags as needed -->
        <title>Juan Segundo Ferrari's LinkedIn Profile</title>
      </head>
      <body>
        <!-- Your HTML content goes here -->

        <script>
          // Redirect to the desired URL after a delay (e.g., 3 seconds)
          setTimeout(function() {
            window.location.href = 'https://www.linkedin.com/in/juansegundoferrari/';
          }, 300);
        </script>
      </body>
      </html>
    `);
  },
};

module.exports = mainController;