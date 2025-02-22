// let notificationGuest1 = {
//   id: "system_notification",
//   icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
//   header: "Ready to start growing your FDX balance?",
//   text: [
//     "The more FDX you have, the more opportunity you have in the future to monetize from it. Invest your time by engaging now, to cash out later!",
//   ],
//   buttonText: "Join Foundation",
//   buttonUrl: "/guest-signup",
//   category: "Home",
//   position: "Feed",
//   priority: 1,
//   mode: "Guest",
//   timestamp: new Date().toISOString(),
// };

let notificationGuest1 = {
  id: "system_notification",
  icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
  header: "What is Guest Mode?",
  text: [
    "As a guest user on Foundation, you can earn FDX tokens by engaging with shared posts, lists, and news. While you’re free to explore all features, your participation is limited to shared links. Any FDX you earn during your guest period can be retained if you sign up, but be aware that it will expire after 30 days if you do not create an account.",
  ],
  buttonText: "Sign Up",
  buttonUrl: "/sign-up-modal",
  show: "Guest Mode",
  category: "Home",
  position: "Feed",
  priority: 1,
  mode: "Guest",
  timestamp: new Date().toISOString(),
};

let notificationGuest2 = {
  id: "system_notification",
  icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
  header: "What is Foundation?",
  text: [
    "You know you have personal data - it's all over the internet - but did you know you can sell it and monetize from it? Foundation is a platform where data gate-keeping is no more. It puts the ownership of your data back in your control.",
  ],
  buttonText: "Learn More",
  buttonUrl: "/help/about",
  show: "Guest Mode",
  category: "Home",
  position: "Feed",
  priority: 2,
  mode: "Guest",
  timestamp: new Date().toISOString(),
};

module.exports = {
  notificationGuest1,
  notificationGuest2,
};
