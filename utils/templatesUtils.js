const calculateTimeAgo = (time) => {
  const currentDate = new Date();
  const createdAtDate = new Date(time);

  if (isNaN(createdAtDate.getTime())) {
    return "Invalid date";
  }

  const timeDifference = currentDate - createdAtDate;
  const seconds = Math.floor(Math.max(timeDifference / 1000, 0));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (seconds > 0) {
    return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
  } else {
    return "Just now";
  }
};

function formatDateMDY(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-based, so add 1
  const year = date.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  return `Published ${formattedDate}`;
}

module.exports = {
  calculateTimeAgo,
  formatDateMDY,
};
