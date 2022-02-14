module.exports = {
    cronFunctions: () => {
        const cron = require('node-cron');
        const Messages = require('../models/Message');
        const ChatMessage = require('../models/ChatMessage');

        cron.schedule('1 0 * * *', async () => {
            console.log('running a task every minute');

            await ChatMessage.remove();

            const nowDayName = new Date().toLocaleDateString('en-EN', { weekday: 'long' });
            const messages = await Messages.find({ day: nowDayName });

            if (messages.length > 0) {
                let arr = messages.map(row => {

                    let date = new Date();
                    let time_parts = String(row.time).split(':');
                    date.setHours(time_parts[0], time_parts[1], 0, 0);

                    return { sender: row.sender, date: date, text: row.text }
                });

                await ChatMessage.insertMany(arr);

                console.log(`\n----- Create a new chat Messages: ${arr.length}\n`);
            }

        });
    }

}