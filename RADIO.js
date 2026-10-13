const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus 
} = require('@discordjs/voice');

// Configuration du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const TOKEN = 'TON_TOKEN_DISCORD_ICI'; // Remplace par ton token Discord Bot
const PREFIX = '!radio';

const player = createAudioPlayer();

// Recherche de radios via l'API Radio-Browser
async function chercherRadio(recherche) {
    try {
        let url = 'https://de1.api.radio-browser.info/json/stations/search?limit=1&hidebroken=true&order=clickcount&reverse=true';
        
        const term = recherche.trim().toLowerCase();
        if (['japan', 'japon', 'jp'].includes(term)) {
            url += '&countrycode=JP';
        } else if (['korea', 'corée', 'kr'].includes(term)) {
            url += '&countrycode=KR';
        } else if (term !== '') {
            url += `&name=${encodeURIComponent(recherche)}`;
        }

        const response = await fetch(url);
        const stations = await response.json();
        return stations.length > 0 ? stations[0] : null;
    } catch (err) {
        console.error("Erreur d'accès à l'API :", err);
        return null;
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commande = args.shift()?.toLowerCase();
    const recherche = args.join(' ');

    // Commande : !radio play <nom, pays ou genre>
    if (commande === 'play') {
        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) {
            return message.reply("Tu dois être dans un salon vocal pour lancer la radio !");
        }

        if (!recherche) {
            return message.reply("Précise un nom, un pays ou un genre (ex: `!radio play japan` ou `!radio play jazz`).");
        }

        message.channel.send(`🔍 Recherche d'une station pour : **${recherche}**...`);
        const station = await chercherRadio(recherche);

        if (!station) {
            return message.channel.send("❌ Aucune radio fonctionnelle trouvée.");
        }

        const streamUrl = station.url_resolved || station.url;

        try {
            // Connexion au salon vocal
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            // Création de la ressource audio
            const resource = createAudioResource(streamUrl);
            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`📻 En direct : **${station.name}** [${station.countrycode || 'WW'}]`);
        } catch (error) {
            console.error(error);
            message.channel.send("❌ Impossible de lire cette station.");
        }
    }

    // Commande : !radio stop
    if (commande === 'stop') {
        player.stop();
        message.channel.send("🛑 Radio arrêtée.");
    }
});

player.on(AudioPlayerStatus.Idle, () => {
    console.log("Flux audio terminé ou interrompu.");
});

client.login(TOKEN);