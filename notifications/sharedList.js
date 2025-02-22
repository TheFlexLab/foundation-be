let notification1 = {
  id: "system_notification",
  header: "Collaborate Through Shared Collections",
  text: [
    "Shared collections encourage collaboration and allow you to contribute your insights anonymously. Plus, you can earn FDX tokens for your participation.",
  ],
  buttonText: "Join Foundation",
  buttonUrl: "",
  youtubeEmbedUrl: "",
  category: "sharedList",
  mode: "User, Guest",
  priority: 1,
  timestamp: new Date().toISOString(),
};

let notification2 = {
  id: "system_notification",
  header: "What is FDX?",
  text: [
    "FDX (Foundation Data Exchange) tokens represent the value of data on the Foundation network. Every interaction on Foundation earns FDX and increases the value of the network.",
  ],
  buttonText: "",
  buttonUrl: "",
  youtubeEmbedUrl: "",
  category: "sharedList",
  mode: "User, Guest",
  priority: 4,
  timestamp: new Date().toISOString(),
};

let notification3 = {
  id: "system_notification",
  header: "Engage with posts, earn FDX",
  text: [
    "Earn FDX tokens for every post participation. Keep scrolling and see how many posts you can participate in, or filter based on what you like!",
  ],
  buttonText: "",
  buttonUrl: "",
  youtubeEmbedUrl: "",
  category: "sharedList",
  mode: "User, Guest",
  priority: 8,
  timestamp: new Date().toISOString(),
};

module.exports = {
  notification1,
  notification2,
  notification3,
};
