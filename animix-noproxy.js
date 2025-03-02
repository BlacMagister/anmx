const fs = require('fs');
const axios = require('axios');
const colors = require('colors');
const readline = require("readline");

const CLAN_ID = 143;
const MAX_THREADS = 50;
const TASK_TIMEOUT = 15 * 60 * 1000;
const REQUEST_DELAY = 500;

let missionsData = null;

async function muatMisiDariAnimix() {
    try {
        const response = await axios.get('https://statics.animix.tech/missions.json', { timeout: 5000 });
        missionsData = response.data;
        console.log('Berhasil memuat missions.json'.cyan);
    } catch (error) {
        console.error('Gagal memuat missions.json:'.red, error.message);
        throw error;
    }
}

class Animix {
    constructor() {
        this.headers = {
            'Accept': '*/*',
            'Accept-encoding': 'gzip, deflate, br, zstd',
            'Accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
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

    tidur(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async cekKlan(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.get('https://pro-api.animix.tech/public/user/info', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            
            if (response.status === 200) {
                const currentClanId = response.data.result.clan_id;
                if (currentClanId === undefined) {
                    console.log(`[Akun ${stt}] Belum bergabung dengan klan, bergabung ke klan ${CLAN_ID}...`.yellow);
                    await this.gabungKlan(query, stt);
                } else if (currentClanId !== CLAN_ID) {
                    console.log(`[Akun ${stt}] Sedang di klan ID ${currentClanId}, keluar dan gabung ke klan ${CLAN_ID}...`.yellow);
                    await this.keluarKlan(query, stt, currentClanId);
                    await this.gabungKlan(query, stt);
                } else {
                    console.log(`[Akun ${stt}] Sudah di klan ID ${CLAN_ID}.`.green);
                }
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal memeriksa klan: ${error.message}`.red);
        }
    }

    async gabungKlan(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const payload = { clan_id: CLAN_ID };
            const response = await axios.post('https://pro-api.animix.tech/public/clan/join', payload, { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (response.status === 200 && response.data.result === true) {
                console.log(`[Akun ${stt}] Berhasil bergabung ke klan ${CLAN_ID}!`.green);
            } else {
                console.log(`[Akun ${stt}] Gagal bergabung ke klan ${CLAN_ID}.`.yellow);
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal bergabung ke klan: ${error.message}`.red);
        }
    }

    async keluarKlan(query, stt, currentClanId) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const payload = { clan_id: currentClanId };
            const response = await axios.post('https://pro-api.animix.tech/public/clan/quit', payload, { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (response.status === 200 && response.data.result === true) {
                console.log(`[Akun ${stt}] Berhasil keluar dari klan ID ${currentClanId}!`.green);
            } else {
                console.log(`[Akun ${stt}] Gagal keluar dari klan ID ${currentClanId}.`.yellow);
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal keluar dari klan: ${error.message}`.red);
        }
    }

    async klaimPVP(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const infoResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/info', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (infoResponse.status !== 200 || !infoResponse.data.result?.not_claimed_rewards_info) return;

            const unclaimedSeasons = [infoResponse.data.result.not_claimed_rewards_info.season_id];
            if (!unclaimedSeasons.length) {
                console.log(`[Akun ${stt}] Tidak ada season untuk diklaim.`.yellow);
                return;
            }

            for (const season_id of unclaimedSeasons) {
                const payload = { season_id };
                const response = await axios.post('https://pro-api.animix.tech/public/battle/user/reward/claim', payload, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);

                if (response.status === 200 && response.data.result?.status === true) {
                    const rewards = response.data.result.rewards.map(r => `id${r.id}:${r.amount}`).join(', ');
                    console.log(`[Akun ${stt}] Berhasil klaim hadiah PVP season ${season_id}: ${rewards}`.green);
                } else {
                    console.log(`[Akun ${stt}] Gagal klaim hadiah PVP season ${season_id}.`.yellow);
                }
            }
        } catch (error) {
            console.log(`[Akun ${stt}] Gagal klaim hadiah PVP: ${error.message}`.red);
        }
    }

    async aturTimPertahanan(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const userInfoResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/info', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (userInfoResponse.status !== 200 || !userInfoResponse.data.result) {
                console.error(colors.red(`[Akun ${stt}] Gagal mengambil info pengguna.`));
                return;
            }

            const currentDefenseTeam = userInfoResponse.data.result.defense_team?.map(pet => pet.pet_id) || [];
            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (petResponse.status !== 200 || !petResponse.data.result) {
                console.error(colors.red(`[Akun ${stt}] Gagal mengambil daftar pet.`));
                return;
            }

            const pets = petResponse.data.result.map(pet => ({ pet_id: pet.pet_id, star: pet.star, level: pet.level }));
            if (pets.length < 3) {
                console.warn(colors.yellow(`[Akun ${stt}] Tidak cukup pet untuk tim pertahanan.`));
                return;
            }

            pets.sort((a, b) => b.star - a.star || b.level - a.level);
            const topPets = pets.slice(0, 3);
            const newDefenseTeam = topPets.map(pet => pet.pet_id);

            if (currentDefenseTeam.length === 3 && currentDefenseTeam.every(id => newDefenseTeam.includes(id))) return;

            const payload = { pet_id_1: newDefenseTeam[0], pet_id_2: newDefenseTeam[1], pet_id_3: newDefenseTeam[2] };
            const defenseResponse = await axios.post('https://pro-api.animix.tech/public/battle/user/defense-team', payload, { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (defenseResponse.status === 200 && defenseResponse.data.result) {
                console.log(colors.green(`[Akun ${stt}] Berhasil mengatur tim pertahanan: ${payload.pet_id_1}, ${payload.pet_id_2}, ${payload.pet_id_3}.`));
            } else {
                console.error(colors.red(`[Akun ${stt}] Gagal mengatur tim pertahanan.`));
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Kesalahan di aturTimPertahanan: ${error.message}`));
        }
    }

    async serang(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };

            while (true) {
                const userInfoResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/info', { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (userInfoResponse.status !== 200 || !userInfoResponse.data.result) continue;

                const availableTickets = userInfoResponse.data.result.ticket.amount;
                if (availableTickets <= 0) {
                    console.log(colors.yellow(`[Akun ${stt}] Tiket habis, keluar...`));
                    break;
                }

                const opponentsResponse = await axios.get('https://pro-api.animix.tech/public/battle/user/opponents', { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (opponentsResponse.status !== 200 || !opponentsResponse.data.result) continue;

                const opponent = opponentsResponse.data.result.opponent;
                const opponentPets = opponent.pets.map(pet => ({ pet_id: pet.pet_id, level: pet.level }));

                const petsJsonResponse = await axios.get('https://statics.animix.tech/pets.json', { timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (petsJsonResponse.status !== 200 || !petsJsonResponse.data.result) continue;

                const petsData = petsJsonResponse.data.result;
                const opponentPetsDetailed = opponentPets.map(opponentPet => {
                    const petInfo = petsData.find(p => p.pet_id === opponentPet.pet_id);
                    return petInfo ? { ...opponentPet, star: petInfo.star, class: petInfo.class } : null;
                }).filter(Boolean);

                const userPetsResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (userPetsResponse.status !== 200 || !userPetsResponse.data.result) continue;

                const userPets = userPetsResponse.data.result.map(pet => ({ pet_id: pet.pet_id, star: pet.star, level: pet.level, class: pet.class }));
                const classAdvantage = { Earth: 'Water', Water: 'Wind', Wind: 'Earth' };

                const selectedPets = [];
                for (const opponentPet of opponentPetsDetailed) {
                    const bestPet = userPets
                        .filter(pet => !selectedPets.some(p => p.pet_id === pet.pet_id))
                        .sort((a, b) => {
                            if (a.star !== b.star) return b.star - a.star;
                            if (a.level !== b.level) return b.level - a.level;
                            return classAdvantage[a.class] === opponentPet.class ? -1 : 1;
                        })[0];

                    if (bestPet) selectedPets.push(bestPet);
                    if (selectedPets.length >= 3) break;
                }

                while (selectedPets.length < 3) {
                    const remainingPet = userPets
                        .filter(pet => !selectedPets.some(p => p.pet_id === pet.pet_id))
                        .sort((a, b) => b.star - a.star || b.level - a.level)[0];
                    if (remainingPet) selectedPets.push(remainingPet);
                    else break;
                }

                if (selectedPets.length < 3) break;

                const attackPayload = {
                    opponent_id: opponent.telegram_id,
                    pet_id_1: selectedPets[0].pet_id,
                    pet_id_2: selectedPets[1].pet_id,
                    pet_id_3: selectedPets[2].pet_id
                };

                const attackResponse = await axios.post('https://pro-api.animix.tech/public/battle/attack', attackPayload, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (attackResponse.status === 200 && attackResponse.data.result) {
                    const isWin = attackResponse.data.result.is_win;
                    const rounds = attackResponse.data.result.rounds;
                    const roundResults = rounds.map((round, index) => `Ronde ${index + 1}: ${round.result ? 'Menang' : 'Kalah'}`).join(', ');
                    console.log(colors.green(`[Akun ${stt}] Serangan: ${isWin ? 'Menang' : 'Kalah'}, Detail: ${roundResults}, Poin: ${attackResponse.data.result.score}`));
                } else {
                    console.error(colors.red(`[Akun ${stt}] Gagal melakukan serangan.`));
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Kesalahan di serang: ${error.message}`));
        }
    }

    async gacha(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.get('https://pro-api.animix.tech/public/user/info', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            if (response.status !== 200 || !response.data.result) return;

            const godPower = response.data.result.god_power;
            const jumlahGacha = Math.floor(godPower / 10);

            const gachaPromises = Array.from({ length: jumlahGacha }, async () => {
                const gachaResponse = await axios.post('https://pro-api.animix.tech/public/pet/dna/gacha', { amount: 10 }, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                if (gachaResponse.status === 200 && gachaResponse.data.result.dna) {
                    const starCount = gachaResponse.data.result.dna.reduce((acc, pet) => {
                        acc[pet.star] = (acc[pet.star] || 0) + 1;
                        return acc;
                    }, {});
                    let resultMessage = `Gacha berhasil: `;
                    for (const star in starCount) resultMessage += `${starCount[star]} kartu ${star}☆, `;
                    console.log(`[Akun ${stt}] ${resultMessage.slice(0, -2)}`.green);
                }
            });

            await Promise.all(gachaPromises);
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal gacha: ${error.message}`));
        }
    }

    async campurPet(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const dnaResponse = await axios.get('https://pro-api.animix.tech/public/pet/dna/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            if (dnaResponse.status !== 200 || !Array.isArray(dnaResponse.data.result)) return;

            const { dna_1, dna_2 } = dnaResponse.data.result.reduce((acc, dna) => {
                if (dna.star < 6 && dna.amount > 0) dna.can_mom ? acc.dna_1.push(dna) : acc.dna_2.push(dna);
                return acc;
            }, { dna_1: [], dna_2: [] });

            if (dna_1.length < 2 && dna_2.length < 1) return;

            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            if (petResponse.status !== 200 || !Array.isArray(petResponse.data.result)) return;

            const petIds = new Set(petResponse.data.result.map(pet => pet.pet_id));
            let counter = 0;

            for (const mom of dna_1) {
                for (const dad of [...dna_1, ...dna_2]) {
                    if (mom.item_id === dad.item_id || mom.amount <= 0 || dad.amount <= 0) continue;
                    const mixKey = mom.item_id * 1000 + dad.item_id;
                    if (petIds.has(mixKey)) continue;

                    const payload = { mom_id: mom.item_id, dad_id: dad.item_id };
                    const mixResponse = await axios.post('https://pro-api.animix.tech/public/pet/mix', payload, { headers, timeout: 5000 });
                    await this.tidur(REQUEST_DELAY);

                    if (mixResponse.status === 200 && mixResponse.data.result) {
                        console.log(`[Akun ${stt}] Berhasil mencampur pet baru: Mom ID ${mom.item_id}, Dad ID ${dad.item_id}`.green);
                        mom.amount--;
                        dad.amount--;
                        counter++;
                        petIds.add(mixKey);
                    }
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal mencampur pet: ${error.message}`));
        }
    }

    async klaimSeasonPass(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.get('https://pro-api.animix.tech/public/season-pass/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            const seasonPasses = response.data.result;

            for (const season of seasonPasses) {
                const freeToClaim = season.free_rewards
                    .filter(reward => season.current_step >= reward.step && !reward.is_claimed)
                    .map(reward => ({ season_id: season.season_id, step: reward.step, type: 'free' }));

                for (const reward of freeToClaim) {
                    const payload = { season_id: reward.season_id, step: reward.step, type: reward.type };
                    const claimResponse = await axios.post('https://pro-api.animix.tech/public/season-pass/claim', payload, { headers, timeout: 5000 });
                    await this.tidur(REQUEST_DELAY);

                    if (claimResponse.data.result === true) {
                        console.log(`[Akun ${stt}] Berhasil klaim: season_id=${reward.season_id}, step=${reward.step}`.green);
                    }
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal klaim season pass: ${error.message}`));
        }
    }

    async klaimBonusGacha(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const bonusResponse = await axios.get('https://pro-api.animix.tech/public/pet/dna/gacha/bonus', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            const { current_step, is_claimed_god_power, is_claimed_dna, step_bonus_god_power, step_bonus_dna, god_power_bonus } = bonusResponse.data.result;

            if (current_step >= step_bonus_god_power && !is_claimed_god_power) {
                await axios.post('https://pro-api.animix.tech/public/pet/dna/gacha/bonus/claim', { reward_no: 1 }, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                console.log(`[Akun ${stt}] Berhasil klaim bonus ${god_power_bonus} God Power`.green);
            }

            if (current_step >= step_bonus_dna && !is_claimed_dna) {
                await axios.post('https://pro-api.animix.tech/public/pet/dna/gacha/bonus/claim', { reward_no: 2 }, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);
                console.log(`[Akun ${stt}] Berhasil klaim bonus DNA`.green);
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal klaim bonus gacha: ${error.message}`));
        }
    }

    async klaimPencapaian(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.get('https://pro-api.animix.tech/public/achievement/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);

            if (response.status !== 200 || !response.data.result) {
                console.log(`[Akun ${stt}] Gagal mengambil daftar pencapaian`.red);
                return;
            }

            const achievements = response.data.result;
            const achievementIds = Object.values(achievements)
                .flatMap(group => (group?.achievements || []).filter(quest => quest.status === true && quest.claimed === false))
                .map(quest => quest.quest_id);

            if (!achievementIds.length) {
                console.log(`[Akun ${stt}] Tidak ada pencapaian untuk diklaim`.yellow);
                return;
            }

            for (const questId of achievementIds) {
                const claimResponse = await axios.post('https://pro-api.animix.tech/public/achievement/claim', { quest_id: questId }, { headers, timeout: 5000 });
                await this.tidur(REQUEST_DELAY);

                if (claimResponse.status === 200 && claimResponse.data.result) {
                    console.log(`[Akun ${stt}] Berhasil klaim pencapaian ID ${questId}`.green);
                } else {
                    console.log(`[Akun ${stt}] Gagal klaim pencapaian ID ${questId}`.yellow);
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal klaim pencapaian: ${error.message}`));
        }
    }

    async daftarPet(query, stt) {
        try {
            const missionResponse = await axios.get('https://pro-api.animix.tech/public/mission/list', { headers: { ...this.headers, 'tg-init-data': query }, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            const missions = missionResponse.data.result;
            const petInMission = {};

            for (const mission of missions) {
                for (const joinedPet of mission.pet_joined || []) {
                    petInMission[joinedPet.pet_id] = (petInMission[joinedPet.pet_id] || 0) + 1;
                }
            }

            const petResponse = await axios.get('https://pro-api.animix.tech/public/pet/list', { headers: { ...this.headers, 'tg-init-data': query }, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            const pets = petResponse.data.result;
            const availablePets = {};

            for (const pet of pets) {
                const key = `${pet.class}_${pet.star}`;
                availablePets[key] = availablePets[key] || [];
                const availableAmount = pet.amount - (petInMission[pet.pet_id] || 0);
                if (availableAmount > 0) {
                    availablePets[key].push({ pet_id: pet.pet_id, star: pet.star, amount: availableAmount });
                }
            }
            return availablePets;
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal daftar pet: ${error.message}`));
            throw error;
        }
    }

    async prosesMisi(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const missionResponse = await axios.get('https://pro-api.animix.tech/public/mission/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            const missions = missionResponse.data.result;
            const availablePets = await this.daftarPet(query, stt);

            const currentTime = Math.floor(Date.now() / 1000);
            for (const mission of missions) {
                if (mission.end_time < currentTime) {
                    const claimResponse = await axios.post('https://pro-api.animix.tech/public/mission/claim', { mission_id: mission.mission_id }, { headers, timeout: 5000 });
                    await this.tidur(REQUEST_DELAY);
                    if (claimResponse.data.error_code === null) {
                        console.log(`[Akun ${stt}] Berhasil klaim misi ${mission.mission_id}`.green);
                    }
                }
            }

            const updatedMissions = (await axios.get('https://pro-api.animix.tech/public/mission/list', { headers, timeout: 5000 })).data.result;
            await this.tidur(REQUEST_DELAY);
            const unstartedMissions = missionsData.result.filter(m => !updatedMissions.some(um => um.mission_id === m.mission_id.toString()));

            for (const mission of unstartedMissions) {
                const conditions = [
                    { class: mission.pet_1_class, star: mission.pet_1_star },
                    { class: mission.pet_2_class, star: mission.pet_2_star },
                    { class: mission.pet_3_class, star: mission.pet_3_star },
                ].filter(c => c.class && c.star);

                const selectedPets = [];
                for (const condition of conditions) {
                    const key = `${condition.class}_${condition.star}`;
                    const pet = availablePets[key]?.find(p => p.amount > 0);
                    if (pet) {
                        selectedPets.push(pet);
                        pet.amount--;
                    } else break;
                }

                if (selectedPets.length === conditions.length) {
                    const payload = {
                        mission_id: mission.mission_id,
                        pet_1_id: selectedPets[0]?.pet_id || null,
                        pet_2_id: selectedPets[1]?.pet_id || null,
                        pet_3_id: selectedPets[2]?.pet_id || null,
                    };
                    const enterResponse = await axios.post('https://pro-api.animix.tech/public/mission/enter', payload, { headers, timeout: 5000 });
                    await this.tidur(REQUEST_DELAY);
                    if (enterResponse.data.error_code === null) {
                        console.log(`[Akun ${stt}] Berhasil masuk misi ${mission.mission_id}`.green);
                    }
                }
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal proses misi: ${error.message}`));
        }
    }

    async daftarQuest(query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.get('https://pro-api.animix.tech/public/quest/list', { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            if (response.status === 200) {
                return response.data.result.quests
                    .filter(quest => quest.status === false && !['REFERRAL_0', 'HI_CLAN', 'HPY25_CLAN', 'REFERRAL_2', 'REFERRAL_5', 'REFERRAL_10'].includes(quest.quest_code))
                    .map(quest => quest.quest_code);
            }
            return [];
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal daftar quest: ${error.message}`));
            return [];
        }
    }

    async cekQuest(questCode, query, stt) {
        try {
            const headers = { ...this.headers, 'tg-init-data': query };
            const response = await axios.post('https://pro-api.animix.tech/public/quest/check', { quest_code: questCode }, { headers, timeout: 5000 });
            await this.tidur(REQUEST_DELAY);
            if (response.status === 200 && response.data.result.status === true) {
                console.log(`[Akun ${stt}] Berhasil klaim quest ${questCode}`.green);
            }
        } catch (error) {
            console.error(colors.red(`[Akun ${stt}] Gagal cek quest ${questCode}: ${error.message}`));
        }
    }

    async prosesQueries(filePath) {
        const startTime = Date.now();
        try {
            await muatMisiDariAnimix();
            const queries = fs.readFileSync(filePath, 'utf-8').split('\n').map(line => line.trim()).filter(Boolean);

            const tasks = queries.map((query, index) => {
                const stt = index + 1;
                return async () => {
                    try {
                        await this.jalankanDenganTimeout(async () => {
                            await this.cekKlan(query, stt);
                            await this.klaimPVP(query, stt);
                            await this.klaimSeasonPass(query, stt);
                            await this.gacha(query, stt);
                            await this.aturTimPertahanan(query, stt);
                            await this.serang(query, stt);
                            await this.klaimBonusGacha(query, stt);
                            await this.campurPet(query, stt);
                            await this.prosesMisi(query, stt);
                            await this.klaimPencapaian(query, stt);
                            const questCodes = await this.daftarQuest(query, stt);
                            for (const code of questCodes) {
                                await this.cekQuest(code, query, stt);
                            }
                        }, TASK_TIMEOUT, stt);
                        console.log(colors.cyan(`[Akun ${stt}] Selesai semua tugas!`));
                    } catch (err) {
                        console.error(colors.red(`[Akun ${stt}] Gagal: ${err.message}`));
                    }
                };
            });

            const chunkedTasks = potongArray(tasks, MAX_THREADS);
            for (const chunk of chunkedTasks) {
                await Promise.all(chunk.map((task, i) => this.tidur(i * 10000).then(task)));
            }

            const elapsedTime = Date.now() - startTime;
            console.log(`Total waktu: ${(elapsedTime / 60000).toFixed(1)} menit`.cyan);
            const remainingTime = Math.max(0, 4 * 60 * 60 * 1000 - elapsedTime);
            if (remainingTime > 0) await hitungMundur(remainingTime / 1000);
            await this.prosesQueries(filePath);
        } catch (error) {
            console.error(colors.red('Gagal membaca file: ', error.message));
        }
    }

    async jalankanDenganTimeout(task, timeout, stt) {
        return Promise.race([
            task(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Waktu habis.`)), timeout))
        ]);
    }
}

function potongArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
    return result;
}

async function hitungMundur(seconds) {
    for (let i = seconds; i > 0; i--) {
        const minutes = Math.floor(i / 60);
        const remainingSeconds = i % 60;
        process.stdout.write(`\r${colors.cyan(`[*] Menunggu ${minutes} menit ${remainingSeconds} detik`)}`.padEnd(80));
        await new Promise(res => setTimeout(res, 1000));
    }
    console.log(`\nMulai ulang...`.green);
}

const animix = new Animix();
animix.prosesQueries('data.txt').catch(err => console.error('Kesalahan: ', err.message));
