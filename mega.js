// mega_upload.js (යාවත්කාලීන කළ කේතය)

const mega = require("megajs");

// 🚨 මෙහිදී, email සහ password එක process.env වෙතින් ලබා ගනී
// ඔබගේ Replit ව්‍යාපෘතියේ Secrets (Environment Variables) තුළ මේවා සකස් කළ යුතුය
const auth = {
    // ⚠️ ඔබේ Mega Email එක මෙහි Mega_Email විචල්‍යයෙන් ගනී
    email: process.env.MEGA_EMAIL, 
    // ⚠️ ඔබේ Mega Password එක මෙහි MEGA_PASSWORD විචල්‍යයෙන් ගනී
    password: process.env.MEGA_PASSWORD, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
}

const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        try {
            // 🛑 වැදගත්: විද්‍යුත් තැපෑලක් හෝ මුරපදයක් නොමැති නම් දෝෂයක් පෙන්වයි
            if (!auth.email || !auth.password) {
                return reject(new Error("MEGA_EMAIL හෝ MEGA_PASSWORD Environment Variables සකසා නැත."));
            }
            
            const storage = new mega.Storage(auth, () => {
                data.pipe(storage.upload({name: name, allowUploadBuffering: true}));
                storage.on("add", (file) => {
                    file.link((err, url) => {
                        if (err) {
                            storage.close();
                            return reject(err);
                        }
                        storage.close()
                        resolve(url);
                    });
                });
                storage.on("error", (err) => {
                    storage.close();
                    return reject(err);
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { upload };
