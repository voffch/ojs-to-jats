export default function getTimestamp(format) {
  let timestamp;
  const date = new Date();
  if (format === 'UNIX') {
    timestamp = Math.round(date.getTime() / 1000);
  } else {
    //YYYYMMDDHHMM or YYYYMMDDHHMMSS or YYYYMMDDHHMMSSsss
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    timestamp = `${year}${month}${day}${hour}${minute}`;
    if (format.includes('YYYYMMDDHHMMSS')) {
      const second = date.getSeconds().toString().padStart(2, '0');
      timestamp += `${second}`;
    } 
    if (format === 'YYYYMMDDHHMMSSsss') {
      const millisecond = date.getMilliseconds().toString().padStart(3, '0');
      timestamp += `${millisecond}`;
    }
  }
  return timestamp;
}