const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const colors = require('colors');
const readline = require("readline");

const clan_id = 143;
const maxThreads = 100;
const taskTimeout = 10 * 60 * 1000; // Timeout 10 menit untuk setiap akun

class Animix {
    constructor() {
        this.headers = {
            'Accept': '*/*',
            'Accept-encoding': 'gzip, deflate, br, zstd',
            'Accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'Content-type': 'application/json',
            'Origin': 'https://tele-game.animix.tech',
            'Referer': 'https://tele-game.animix.tech/',
            'Sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'Sec-ch-ua-mobile': '?0',
            'Sec-ch-ua-platform': '"Windows"',
            'Sec-fetch-dest': 'empty',
            'Sec-fetch-mode': 'cors',
            'Sec-fetch-site': 'same-site',
            'User-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkProxyIP(proxy, stt) {
        return new Promise(async (resolve, reject) => {
            try {
                const proxyAgent = new HttpsProxyAgent(proxy);
                const response = await axios.get('https://api.ipify.org?format=json', {
                    httpsAgent: proxyAgent
                });

                if (response.status === 200) {
                    console.log(colors.blue(`[Akun ${stt}] Menggunakan proxy ${proxy} - IP: ${response.data.ip}`));
                    resolve(proxyAgent);
                } else {
                    throw new Error(`Tidak dapat memeriksa IP proxy. Status code: ${response.status}`);
                }
            } catch (error) {
                console.error(colors.red(`[Akun ${stt}] Gagal memeriksa proxy: ${proxy}. Detail: ${error.message}`));
                reject(error);
            }
        });
    }

    async checkClan(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const response = await axios.get('https://pro-api.animix.tech/public/user/info', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (response.status === 200) {
                const currentClanId = response.data.result.clan_id;

                if (currentClanId === undefined) {
                    console.log(`[Akun ${stt}] Belum bergabung dengan clan, bergabung dengan clan ${clan_id}...`.yellow);
                    await this.joinClan(proxyAgent, query, stt);
                } else if (currentClanId !== clan_id) {
                    console.log(`[Akun ${stt}] Sedang berada di clan ID ${currentClanId}, keluar dan bergabung dengan clan ${clan_id}...`.yellow);
                    await this.quitClan(proxyAgent, query, stt, currentClanId);
                    await this.joinClan(proxyAgent, query, stt);
                } else {
                    console.log(`[Akun ${stt}] Sudah berada di clan ID ${clan_id}.`.green);
                }
                await this.sleep(2000);
            } else {
                throw new Error(`Gagal mengambil informasi clan. Status code: ${response.status}`);
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal memeriksa clan: ${error.message}`.red);
            throw error;
        }
    }

    async joinClan(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const payload = { clan_id };
            const response = await axios.post(
                'https://pro-api.animix.tech/public/clan/join',
                payload,
                { headers, httpsAgent: proxyAgent }
            );

            if (response.status === 200 && response.data.result === true) {
                console.log(`[Akun ${stt}] Berhasil bergabung dengan clan ${clan_id}!`.green);
            } else {
                console.log(`[Akun ${stt}] Gagal bergabung dengan clan ${clan_id}.`.yellow);
            }
            await this.sleep(2000);
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal saat bergabung dengan clan: ${error.message}`.red);
            throw error;
        }
    }

    async quitClan(proxyAgent, query, stt, currentClanId) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const payload = { clan_id: currentClanId };
            const response = await axios.post(
                'https://pro-api.animix.tech/public/clan/quit',
                payload,
                { headers, httpsAgent: proxyAgent }
            );

            if (response.status === 200 && response.data.result === true) {
                console.log(`[Akun ${stt}] Berhasil keluar dari clan ID ${currentClanId}!`.green);
                await this.sleep(2000);
            } else {
                console.log(`[Akun ${stt}] Gagal keluar dari clan ID ${currentClanId}.`.yellow);
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal saat keluar dari clan: ${error.message}`.red);
            throw error;
        }
    }

    async setDefenseTeam(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };

            const userInfoResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/info', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (userInfoResponse.status !== 200 || !userInfoResponse.data.result) {
                console.error(colors.red(`[Akun ${stt}] Gagal mengambil informasi pengguna.`));
                return;
            }

            const currentDefenseTeam = userInfoResponse.data.result.defense_team?.map(pet => pet.pet_id) || [];

            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (petResponse.status !== 200 || !petResponse.data.result) {
                console.error(colors.red(`[Akun ${stt}] Gagal mengambil daftar pet.`));
                return;
            }

            const pets = petResponse.data.result.map(pet => ({
                pet_id: pet.pet_id,
                star: pet.star,
                level: pet.level
            }));

            if (pets.length === 0) {
                console.warn(colors.yellow(`[Akun ${stt}] Tidak ada pet yang tersedia.`));
                return;
            }

            pets.sort((a, b) => b.star - a.star || b.level - a.level);

            const topPets = pets.slice(0, 3);

            if (topPets.length < 3) {
                console.warn(colors.yellow(`[Akun ${stt}] Tidak cukup 3 pet untuk mengatur defense team.`));
                return;
            }

            const newDefenseTeam = topPets.map(pet => pet.pet_id);

            if (currentDefenseTeam.length === 3 && currentDefenseTeam.every(id => newDefenseTeam.includes(id))) {
                return;
            }

            const payload = {
                pet_id_1: newDefenseTeam[0],
                pet_id_2: newDefenseTeam[1],
                pet_id_3: newDefenseTeam[2]
            };

            const defenseResponse = await axios.post(
                'https://pro-api.animix.tech/public/battle/user/defense-team',
                payload,
                {
                    headers,
                    httpsAgent: proxyAgent,
                }
            );

            if (defenseResponse.status === 200 && defenseResponse.data.result) {
                console.log(colors.green(
                    `[Akun ${stt}] Defense team berhasil diatur dengan pet_id: ${payload.pet_id_1}, ${payload.pet_id_2}, ${payload.pet_id_3}.`
                ));
            } else {
                console.error(colors.red(`[Akun ${stt}] Gagal mengatur defense team.`));
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal dalam setDefenseTeam: ${error.message}`));
        }
    }

    async attack(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };

            while (true) {
                const userInfoResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/info', {
                    headers,
                    httpsAgent: proxyAgent,
                });

                if (userInfoResponse.status !== 200 || !userInfoResponse.data.result) {
                    console.error(colors.red(`[Akun ${stt}] Gagal mengambil informasi akun.`));
                    continue;
                }

                const userInfo = userInfoResponse.data.result;
                const availableTickets = userInfo.ticket.amount;

                if (availableTickets <= 0) {
                    console.log(colors.yellow(`[Akun ${stt}] Tiket habis, keluar...`));
                    break;
                }

                const opponentsResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/opponents', {
                    headers,
                    httpsAgent: proxyAgent,
                });

                if (opponentsResponse.status !== 200 || !opponentsResponse.data.result) {
                    console.error(colors.red(`[Akun ${stt}] Gagal mengambil lawan.`));
                    continue;
                }

                const opponent = opponentsResponse.data.result.opponent;
                const opponentPets = opponent.pets.map(pet => ({
                    pet_id: pet.pet_id,
                    level: pet.level
                }));

                const petsJsonResponse = await axios.get('https://statics.animix.tech/pets.json');

                if (petsJsonResponse.status !== 200 || !petsJsonResponse.data.result) {
                    console.error(colors.red(`[Akun ${stt}] Gagal mengambil data pets.json.`));
                    continue;
                }

                const petsData = petsJsonResponse.data.result;
                const opponentPetsDetailed = opponentPets.map(opponentPet => {
                    const petInfo = petsData.find(p => p.pet_id === opponentPet.pet_id);
                    return petInfo ? { ...opponentPet, star: petInfo.star, class: petInfo.class } : null;
                }).filter(Boolean);

                const userPetsResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', {
                    headers,
                    httpsAgent: proxyAgent,
                });

                if (userPetsResponse.status !== 200 || !userPetsResponse.data.result) {
                    console.error(colors.red(`[Akun ${stt}] Gagal mengambil daftar pet.`));
                    continue;
                }

                const userPets = userPetsResponse.data.result.map(pet => ({
                    pet_id: pet.pet_id,
                    star: pet.star,
                    level: pet.level,
                    class: pet.class
                }));

                const classAdvantage = { Earth: 'Water', Water: 'Wind', Wind: 'Earth' };

                let strongPetsCount = 0;
                const selectedPets = [];

                for (const opponentPet of opponentPetsDetailed) {
                    let bestPet = userPets
                        .filter(pet => pet.star >= opponentPet.star)
                        .sort((a, b) => {
                            if (a.star !== b.star) return b.star - a.star;
                            if (a.level !== b.level) return b.level - a.level;
                            const classA = classAdvantage[a.class] === opponentPet.class;
                            const classB = classAdvantage[b.class] === opponentPet.class;
                            return classB - classA;
                        })[0];

                    if (bestPet && !selectedPets.some(pet => pet.pet_id === bestPet.pet_id)) {
                        selectedPets.push(bestPet);
                        if (bestPet.star > opponentPet.star) {
                            strongPetsCount++;
                        }
                    }

                    if (strongPetsCount >= 2) {
                        break;
                    }
                }

                if (strongPetsCount < 2) {
                    const weakOrEqualPet = userPets
                        .filter(pet => !selectedPets.some(p => p.pet_id === pet.pet_id))
                        .sort((a, b) => {
                            return b.star - a.star || b.level - a.level;
                        })[0];

                    if (weakOrEqualPet) {
                        selectedPets.push(weakOrEqualPet);
                    }
                }

                if (selectedPets.length < 3) {
                    const remainingPet = userPets
                        .filter(pet => !selectedPets.some(p => p.pet_id === pet.pet_id))
                        .sort((a, b) => b.star - a.star || b.level - a.level)[0];

                    if (remainingPet) {
                        selectedPets.push(remainingPet);
                    }
                }

                if (selectedPets.length < 3) {
                    const strongestPet = userPets
                        .filter(pet => !selectedPets.some(p => p.pet_id === pet.pet_id))
                        .sort((a, b) => b.star - a.star || b.level - a.level)[0];

                    selectedPets.push(strongestPet);
                }

                if (selectedPets.length < 3) {
                    break;
                }

                const attackPayload = {
                    opponent_id: opponent.telegram_id,
                    pet_id_1: selectedPets[0].pet_id,
                    pet_id_2: selectedPets[1].pet_id,
                    pet_id_3: selectedPets[2].pet_id
                };

                const attackResponse = await axios.post(
                    'https://pro-api.animix.tech/public/battle/attack',
                    attackPayload,
                    { headers, httpsAgent: proxyAgent }
                );

                if (attackResponse.status === 200 && attackResponse.data.result) {
                    const isWin = attackResponse.data.result.is_win;
                    const rounds = attackResponse.data.result.rounds;

                    const roundResults = rounds.map((round, index) => {
                        const result = round.result ? 'Menang' : 'Kalah';
                        return `Round ${index + 1}: ${result}`;
                    }).join(', ');

                    const resultMessage = isWin ? 'Menang' : 'Kalah';

                    console.log(colors.green(
                        `[Akun ${stt}] Menyerang: ${resultMessage}, Detail: ${roundResults}, Poin: ${attackResponse.data.result.score}`
                    ));
                    await this.sleep(15000);

                    const updatedTickets = attackResponse.data.result.ticket.amount;
                    if (updatedTickets <= 0) {
                        console.log(colors.cyan(`[Akun ${stt}] Tiket habis...`));
                        break;
                    }
                } else {
                    console.error(colors.red(`[Akun ${stt}] Gagal melakukan serangan.`));
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal dalam attack: ${error.message}`));
        }
    }

    async gacha(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const response = await axios.get('https://pro-api.animix.tech/public/user/info', {
                headers,
                httpsAgent: proxyAgent,
            });
            if (response.status === 200 && response.data.result) {
                const godPower = response.data.result.god_power;
                const SL = Math.floor(godPower / 10);
                const gachaPromises = [];

                for (let i = 0; i < SL; i++) {
                    const gachaRequest = axios.post(
                        'https://pro-api.animix.tech/public/pet/dna/gacha',
                        { amount: 10 },
                        {
                            headers,
                            httpsAgent: proxyAgent,
                        }
                    ).then(gachaResponse => {
                        if (gachaResponse.status === 200 && gachaResponse.data) {
                            const dna = gachaResponse.data.result.dna;

                            if (Array.isArray(dna)) {
                                const starCount = dna.reduce((acc, pet) => {
                                    const star = pet.star;
                                    acc[star] = (acc[star] || 0) + 1;
                                    return acc;
                                }, {});

                                let resultMessage = `Gacha berhasil mendapatkan: `;
                                for (const star in starCount) {
                                    resultMessage += `${starCount[star]} kartu ${star}☆, `;
                                }

                                resultMessage = resultMessage.slice(0, -2);
                                console.log(`[Akun ${stt}] ${resultMessage}`.green);
                            } else {
                                console.log(`[Akun ${stt}] Gacha tidak mendapatkan kartu yang valid. Data error:`, dna);
                            }
                        } else {
                            console.log(`[Akun ${stt}] Gacha request ${i + 1} gagal:`, gachaResponse.data);
                        }
                    }).catch(err => {
                        console.log(`[Akun ${stt}] Gacha request ${i + 1} error:`, err.message);
                    });

                    gachaPromises.push(gachaRequest);

                    await this.sleep(2000);
                }

                await Promise.all(gachaPromises);
            } else {
                console.log(`[Akun ${stt}] Gagal mengambil informasi pengguna. Response:`, response.data);
                throw new Error("Gagal mengambil informasi pengguna");
            }
        } catch (error) {
            console.error(`[Akun ${stt}] Gagal: ${error.message}`.red);
            throw error;
        }
    }

    async mixPet(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };

            const response = await axios.get('https://pro-api.animix.tech/public/pet/dna/list', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (response.status !== 200 || !Array.isArray(response.data.result)) {
                console.log(`[Akun ${stt}] Gagal mengambil daftar DNA. Response: ${JSON.stringify(response.data)}`.yellow);
                return;
            }

            const { dna_1, dna_2 } = response.data.result.reduce(
                (acc, dna) => {
                    if (dna.star < 6 && dna.amount > 0) {
                        dna.can_mom ? acc.dna_1.push(dna) : acc.dna_2.push(dna);
                    }
                    return acc;
                },
                { dna_1: [], dna_2: [] }
            );

            if ((dna_1.length < 2 && dna_2.length < 1) || dna_1.length < 1) return;

            const momList = [...dna_1];
            const dadList = [...dna_1, ...dna_2];

            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (petResponse.status !== 200 || !Array.isArray(petResponse.data.result)) {
                console.log(`[Akun ${stt}] Gagal mengambil daftar pet_id. Response: ${JSON.stringify(petResponse.data)}`.yellow);
                return;
            }

            const petIds = new Set(petResponse.data.result.map(pet => pet.pet_id));

            let savedPair = null;
            let counter = 0;
            console.log(`[Akun ${stt}] Memeriksa DNA yang cocok untuk mix pet baru...`.green);
            const performMix = async (mom, dad) => {
                const mixKey1 = mom.item_id * 1000 + dad.item_id;

                if (petIds.has(mixKey1)) return;

                const mixKey2 = dad.item_id * 1000 + mom.item_id;
                if (petIds.has(mixKey2)) return;

                if (mom.amount === 0 || dad.amount === 0) {
                    return;
                }

                const payload = { mom_id: mom.item_id, dad_id: dad.item_id };

                try {
                    const mixResponse = await axios.post('https://pro-api.animix.tech/public/pet/mix', payload, {
                        headers,
                        httpsAgent: proxyAgent,
                    });

                    if (mixResponse.status === 200 && mixResponse.data.result) {
                        console.log(`[Akun ${stt}] Berhasil mix pet baru: Mom ID ${mom.item_id}, Dad ID ${dad.item_id}`.green);
                        mom.amount--;
                        dad.amount--;
                        counter++;
                        petIds.add(mixKey1);
                    } else {
                        console.log(`[Akun ${stt}] Gagal mix. Response: ${JSON.stringify(mixResponse.data)}`.yellow);
                    }
                } catch (mixError) {
                    console.error(`[Akun ${stt}] Gagal saat melakukan mix: ${mixError.message}`.red);
                }
            };

            for (const mom of momList) {
                for (const dad of dadList) {
                    if (mom.item_id === dad.item_id) continue;
                    savedPair = savedPair || { mom, dad };

                    await performMix(mom, dad);
                    await this.sleep(2000);
                }
            }

            if (counter === 0 && savedPair) {
                console.log(`[Akun ${stt}] Tidak ada DNA yang cocok untuk mix pet baru, mencoba mix pet acak untuk menyelesaikan daily quest.`.green);
                const { mom, dad } = savedPair;

                const payload = {
                    mom_id: mom.item_id,
                    dad_id: dad.item_id,
                };

                try {
                    const mixResponse = await axios.post('https://pro-api.animix.tech/public/pet/mix', payload, {
                        headers,
                        httpsAgent: proxyAgent,
                    });

                    if (mixResponse.status === 200 && mixResponse.data.result) {
                        console.log(`[Akun ${stt}] Berhasil mix pet acak: Mom ID ${mom.item_id}, Dad ID ${dad.item_id}`.green);
                    } else {
                        console.log(`[Akun ${stt}] Gagal mix. Response: ${JSON.stringify(mixResponse.data)}`.yellow);
                    }
                } catch (mixError) {
                    console.error(`[Akun ${stt}] Gagal saat melakukan mix: ${mixError.message}`.red);
                }
            }

        } catch (error) {
            console.error(`[Akun ${stt}] Gagal saat melakukan mixPet: ${error.message}`.red);
            throw error;
        }
    }

    async claimSeasonPass(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };

            const response = await axios.get('https://pro-api.animix.tech/public/season-pass/list', {
                headers,
                httpsAgent: proxyAgent,
            });

            const seasonPasses = response.data.result;

            for (const season of seasonPasses) {
                const { season_id, current_step, free_rewards = [] } = season;

                const freeToClaim = free_rewards
                    .filter(reward => current_step >= reward.step && !reward.is_claimed)
                    .map(reward => ({
                        season_id,
                        step: reward.step,
                        type: 'free',
                    }));

                for (const reward of freeToClaim) {
                    const payload = {
                        season_id: reward.season_id,
                        step: reward.step,
                        type: reward.type,
                    };

                    const claimResponse = await axios.post(
                        'https://pro-api.animix.tech/public/season-pass/claim',
                        payload,
                        {
                            headers,
                            httpsAgent: proxyAgent,
                        }
                    );

                    const { error_code, message, result } = claimResponse.data;

                    if (result === true) {
                        console.log(
                            `[Akun ${stt}] Berhasil claim: season_id=${reward.season_id}, step=${reward.step}, type=${reward.type}`.green
                        );
                    } else {
                        console.warn(
                            `[Akun ${stt}] Gagal claim: season_id=${reward.season_id}, step=${reward.step}, type=${reward.type}`.yellow,
                            `Error: ${error_code || message || 'Unknown error'}`
                        );
                    }

                    await this.sleep(2000);
                }
            }
        } catch (error) {
            console.error(`[Akun ${stt}] Gagal: ${error.message}`.red);
            throw error;
        }
    }

    async claimBonusGacha(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const bonusResponse = await axios.get('https://pro-api.animix.tech/public/pet/dna/gacha/bonus', {
                headers,
                httpsAgent: proxyAgent,
            });

            const bonusData = bonusResponse.data.result;
            const {
                current_step,
                is_claimed_god_power,
                is_claimed_dna,
                step_bonus_god_power,
                step_bonus_dna
            } = bonusData;

            if (current_step >= step_bonus_god_power && !is_claimed_god_power) {
                console.log(`[Akun ${stt}] Berhasil claim bonus ${bonusData.god_power_bonus} God Power`.green);
                await axios.post(
                    'https://pro-api.animix.tech/public/pet/dna/gacha/bonus/claim',
                    { reward_no: 1 },
                    {
                        headers,
                        httpsAgent: proxyAgent,
                    }
                );
            }

            if (current_step >= step_bonus_dna && !is_claimed_dna) {
                console.log(`[Akun ${stt}] Berhasil claim bonus DNA`.green);
                await axios.post(
                    'https://pro-api.animix.tech/public/pet/dna/gacha/bonus/claim',
                    { reward_no: 2 },
                    {
                        headers,
                        httpsAgent: proxyAgent,
                    }
                );
            }

            await this.sleep(2000);
        } catch (error) {
            console.error(`[Akun ${stt}] Gagal saat claim bonus: ${error.message}`.red);
            throw error;
        }
    }

    async claimAchievements(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };

            const response = await axios.get('https://pro-api.animix.tech/public/achievement/list', {
                headers,
                httpsAgent: proxyAgent,
            });

            if (response.status === 200 && response.data.result) {
                const achievements = response.data.result;
                const achievementIds = [];

                for (const key in achievements) {
                    if (achievements[key]?.achievements) {
                        achievements[key].achievements.forEach((quest) => {
                            if (quest.status === true && quest.claimed === false) {
                                achievementIds.push(quest.quest_id);
                            }
                        });
                    }
                }

                for (const questId of achievementIds) {
                    try {
                        const claimResponse = await axios.post(
                            'https://pro-api.animix.tech/public/achievement/claim',
                            { quest_id: questId },
                            {
                                headers,
                                httpsAgent: proxyAgent,
                            }
                        );

                        if (claimResponse.status === 200 && claimResponse.data) {
                            console.log(`[Akun ${stt}] Berhasil claim achievement ID ${questId}`.green);
                        } else {
                            console.log(`[Akun ${stt}] Gagal claim achievement ID ${questId}: ${claimResponse.statusText}`.red);
                        }
                        await this.sleep(2000);
                    } catch (error) {
                        console.log(`[Akun ${stt}] Gagal claim achievement ID ${questId}: ${error.message}`.red);
                        throw error;
                    }
                }
            } else {
                console.log(`[Akun ${stt}] Gagal mengambil achievements`.red);
            }

        } catch (error) {
            console.log(`[Akun ${stt}] Gagal mengambil achievements: ${error.message}`.red);
            throw error;
        }
    }

    async Pets(proxyAgent, query, stt) {
        try {
            const missionResponse = await axios.get('https://pro-api.animix.tech/public/mission/list', {
                headers: { ...this.headers, 'tg-init-data': `${query}` },
                httpsAgent: proxyAgent,
            });

            const missions = missionResponse.data.result;
            const petInMission = {};

            for (const mission of missions) {
                if (mission.can_completed === false) {
                    for (const joinedPet of mission.pet_joined || []) {
                        const { pet_id } = joinedPet;
                        petInMission[pet_id] = (petInMission[pet_id] || 0) + 1;
                    }
                }
            }

            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', {
                headers: { ...this.headers, 'tg-init-data': `${query}` },
                httpsAgent: proxyAgent,
            });

            const pets = petResponse.data.result;
            const availablePets = {};
            for (const pet of pets) {
                const key = `${pet.class}_${pet.star}`;
                if (!availablePets[key]) {
                    availablePets[key] = [];
                }

                const availableAmount = pet.amount - (petInMission[pet.pet_id] || 0);
                if (availableAmount > 0) {
                    availablePets[key].push({
                        pet_id: pet.pet_id,
                        star: pet.star,
                        amount: availableAmount,
                    });
                }
            }

            return availablePets;
        } catch (error) {
            console.error(`[Akun ${stt}] Gagal: ${error.message}`.red);
            throw error;
        }
    }

    async processMission(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const missionResponse = await axios.get('https://pro-api.animix.tech/public/mission/list', {
                headers,
                httpsAgent: proxyAgent,
            });
            const missions = missionResponse.data.result;

            const availablePets = await this.Pets(proxyAgent, query, stt);
            const canCompletedMissions = [];
            const missionsWithoutCanCompleted = [];

            for (const mission of missions) {
                const {
                    mission_id,
                    can_completed,
                    pet_1_class,
                    pet_1_star,
                    pet_2_class,
                    pet_2_star,
                    pet_3_class,
                    pet_3_star,
                } = mission;

                if (can_completed === true) {
                    canCompletedMissions.push(mission);
                } else if (can_completed === undefined) {
                    missionsWithoutCanCompleted.push(mission);
                }
            }

            for (const mission of canCompletedMissions) {
                const { mission_id } = mission;
                const claimPayload = { mission_id };
                const claimResponse = await axios.post(
                    'https://pro-api.animix.tech/public/mission/claim',
                    claimPayload,
                    { headers, httpsAgent: proxyAgent }
                );

                if (claimResponse.data.error_code === null) {
                    console.log(`[Akun ${stt}] Berhasil claim mission ${mission_id}`.green);
                } else {
                    console.log(`[Akun ${stt}] Gagal claim mission ${mission_id}`.red);
                    continue;
                }

                await this.sleep(2000);
            }

            const allMissionsToEnter = [...canCompletedMissions, ...missionsWithoutCanCompleted];

            for (const mission of allMissionsToEnter) {
                const {
                    mission_id,
                    pet_1_class,
                    pet_1_star,
                    pet_2_class,
                    pet_2_star,
                    pet_3_class,
                    pet_3_star,
                } = mission;

                const selectedPets = [];
                const conditions = [
                    { class: pet_1_class, star: pet_1_star },
                    { class: pet_2_class, star: pet_2_star },
                    { class: pet_3_class, star: pet_3_star },
                ];

                let canEnter = true;
                let missingConditions = [];
                for (const condition of conditions) {
                    const { class: petClass, star: petStar } = condition;
                    if (!petClass || !petStar) continue;

                    const key = `${petClass}_${petStar}`;
                    if (!availablePets[key] || availablePets[key].length === 0) {
                        canEnter = false;
                        missingConditions.push(`Tidak ada pet ${petClass} ${petStar}`);
                        break;
                    }

                    let petFound = false;
                    for (const pet of availablePets[key]) {
                        if (pet.amount > 0) {
                            selectedPets.push({
                                pet_id: pet.pet_id,
                                class: petClass,
                                star: petStar,
                            });
                            pet.amount -= 1;
                            petFound = true;
                            break;
                        }
                    }

                    if (!petFound) {
                        canEnter = false;
                        missingConditions.push(`Tidak cukup pet ${petClass} ${petStar}`);
                        break;
                    }
                }

                if (!canEnter) {
                    continue;
                }

                const payload = {
                    mission_id,
                    pet_1_id: selectedPets[0]?.pet_id || null,
                    pet_2_id: selectedPets[1]?.pet_id || null,
                    pet_3_id: selectedPets[2]?.pet_id || null,
                };
                const enterResponse = await axios.post(
                    'https://pro-api.animix.tech/public/mission/enter',
                    payload,
                    { headers, httpsAgent: proxyAgent }
                );

                if (enterResponse.data.error_code === null) {
                    console.log(`[Akun ${stt}] Berhasil masuk ke mission ${mission_id}`.green);
                } else {
                    console.log(`[Akun ${stt}] Gagal masuk ke mission ${mission_id}:`, enterResponse.data);
                }

                await this.sleep(2000);
            }

        } catch (error) {
            console.log(`[Akun ${stt}] Gagal: ${error.message}`.red);
            throw error;
        }
    }

    async getList(proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };
            const response = await axios.get(
                'https://pro-api.animix.tech/public/quest/list',
                { headers, httpsAgent: proxyAgent }
            );

            if (response.status === 200) {
                const questCodes = response.data.result.quests
                    .filter(quest => quest.status === false && quest.quest_code !== 'REFERRAL_0' && quest.quest_code !== 'HI_CLAN' && quest.quest_code !== 'HPY25_CLAN')
                    .map(quest => quest.quest_code);
                await this.sleep(2000);

                return questCodes;
            } else {
                console.log(`[Akun ${stt}] Gagal mengambil daftar quest. Status code: ${response.status}`.yellow);
                return [];
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal mengambil daftar quest: ${error.message}`.red);
            throw error;
        }
    }

    async checkQuest(questCode, proxyAgent, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': `${query}` };

            const response = await axios.post(
                'https://pro-api.animix.tech/public/quest/check',
                { quest_code: questCode },
                {
                    headers,
                    httpsAgent: proxyAgent,
                }
            );

            if (response.status === 200) {
                if (response.data.result.status === true) {
                    console.log(`[Akun ${stt}] Berhasil claim quest ${questCode}.`.green);
                } else {
                    console.log(`[Akun ${stt}] Gagal check quest ${questCode}.`.yellow);
                }

                await this.sleep(2000);

                return response.data.result;
            } else {
                throw new Error(`Gagal check quest. Status code: ${response.status}`);
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal check quest ${questCode}: ${error.message}`.red);
            throw error;
        }
    }

    async processQueries(queryFilePath, proxyFilePath) {
        const startTime = Date.now();
        console.log(colors.magenta(`Tool dibagikan di: <https://t.me/dredchat>`));

        try {
            const queryData = fs.readFileSync(queryFilePath, 'utf-8');
            const proxyData = fs.readFileSync(proxyFilePath, 'utf-8');
            const queries = queryData.split('\n').map(line => line.trim()).filter(line => line !== '');
            const proxies = proxyData.split('\n').map(line => line.trim()).filter(line => line !== '');

            if (queries.length > proxies.length) {
                console.error(colors.red('Jumlah query dan proxy tidak sesuai. Silakan periksa kembali.'));
                return;
            }

            const tasks = queries.map((query, index) => {
                const stt = index + 1;
                const proxy = proxies[index];

                return async () => {
                    let attempt = 0;
                    const maxRetries = 3;

                    while (attempt < maxRetries) {
                        try {
                            await this.runWithTimeout(async () => {
                                const proxyAgent = await this.checkProxyIP(proxy, stt);
                                await this.checkClan(proxyAgent, query, stt);
                                await this.claimSeasonPass(proxyAgent, query, stt);
                                await this.gacha(proxyAgent, query, stt);
                                await this.setDefenseTeam(proxyAgent, query, stt);
                                await this.attack(proxyAgent, query, stt);
                                await this.claimBonusGacha(proxyAgent, query, stt);
                                await this.mixPet(proxyAgent, query, stt);
                                await this.processMission(proxyAgent, query, stt);
                                await this.claimAchievements(proxyAgent, query, stt);

                                const questCodes = await this.getList(proxyAgent, query, stt);
                                for (const questCode of questCodes) {
                                    await this.checkQuest(questCode, proxyAgent, query, stt);
                                }
                            }, taskTimeout, stt);

                            console.log(colors.cyan(`[Akun ${stt}] Semua tugas selesai!`));
                            break;
                        } catch (err) {
                            attempt++;
                            console.error(colors.red(`[Akun ${stt}] Gagal: ${err.message}`));

                            if (attempt >= maxRetries) {
                                console.error(colors.red(`[Akun ${stt}] Gagal setelah 3 percobaan, melewati akun...`));
                                break;
                            } else {
                                console.log(colors.yellow(`[Akun ${stt}] Mencoba lagi dalam 2 detik...`));
                                await this.sleep(2000);
                            }
                        }
                    }
                };
            });

            const chunkedTasks = chunkArray(tasks, maxThreads);
            for (const chunk of chunkedTasks) {
                const taskPromises = chunk.map((task, index) => {
                    return this.sleep(index * 2000).then(task);
                });
                await Promise.all(taskPromises);
            }

            const elapsedTime = Date.now() - startTime;
            console.log(`Total waktu pemrosesan: ${(elapsedTime / (60 * 1000)).toFixed(1)} menit`);

            const remainingTime = Math.max(0, 4.1 * 60 * 60 * 1000 - elapsedTime);

            if (remainingTime > 0) {
                await countdown(remainingTime / 1000);
            }
            await this.processQueries(queryFilePath, proxyFilePath);

        } catch (error) {
            console.error(colors.red('Gagal membaca file data: ', error.message));
        }
    }

    async runWithTimeout(task, timeout, stt) {
        return Promise.race([
            task(),
            new Promise((_, reject) => setTimeout(() => {
                reject(new Error(`Timeout.`));
            }, timeout))
        ]);
    }
}

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function countdown(seconds) {
    return new Promise(async (resolve) => {
        for (let i = seconds; i > 0; i--) {
            const minutes = Math.floor(i / 60);
            const remainingSeconds = i % 60;
            process.stdout.write(`\r${colors.cyan(`[*] Menunggu ${minutes} menit ${remainingSeconds.toFixed(0)} detik untuk melanjutkan`)}`.padEnd(80));
            await new Promise((res) => setTimeout(res, 1000));
        }
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        console.log(`Memulai loop baru...`.green);
        resolve();
    });
}

const animix = new Animix();
animix.processQueries('data.txt', 'proxy.txt').catch(err => console.error('Gagal: ', err.message));
