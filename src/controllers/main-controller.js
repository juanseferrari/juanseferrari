// Requires
const path = require("path");


const mainController = {
 
  home: (req,res) => {
    res.redirect('https://linktr.ee/juanseferrari')
  },
  trabajo: (req,res) => {
    res.redirect("https://www.linkedin.com/in/juansegundoferrari/")
  }
  
};

module.exports = mainController;