// let notificationVisitor1 = {
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
//   mode: "Visitor",
//   timestamp: new Date().toISOString(),
// };

let notificationVisitor1 = {
    id: "system_notification",
    icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
    header: "What is Visitor Mode?",
    text: [
        "As a visitor on Foundation, you can explore all features of the platform, but your participation is limited. You won’t be able to engage with any links shared from foundation. Visitor status is assigned if you’ve already been granted guest or user access from your IP address, which helps reduce abuse of shared links. To participate in shared links, you must sign up for an account.",
    ],
    buttonText: "Sign Up",
    buttonUrl: "/sign-up-modal",
    show: "Visitor Mode",
    category: "Home",
    position: "Feed",
    priority: 1,
    mode: "Visitor",
    timestamp: new Date().toISOString(),
};

let notificationVisitor2 = {
    id: "system_notification",
    icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
    header: "What is Foundation?",
    text: [
        "You know you have personal data - it's all over the internet - but did you know you can sell it and monetize from it? Foundation is a platform where data gate-keeping is no more. It puts the ownership of your data back in your control.",
    ],
    buttonText: "Learn More",
    buttonUrl: "/help/about",
    show: "Visitor Mode",
    category: "Home",
    position: "Feed",
    priority: 2,
    mode: "Visitor",
    timestamp: new Date().toISOString(),
};

module.exports = {
    notificationVisitor1,
    notificationVisitor2,
};
