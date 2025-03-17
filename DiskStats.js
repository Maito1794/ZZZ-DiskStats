const fs = require('fs');
const path = require('path');

// Base URLs for data fetching
const BASE_URL = 'https://www.prydwen.gg/page-data/zenless/characters';
const JS_URL = 'https://www.prydwen.gg/component---src-dynamic-pages-zzz-character-dynamic-tsx-676e4f1f549fc56d0d4d.js';

/**
 * Main function to orchestrate the entire process
 */
async function main() {
    try {
        console.log('🔄 Starting ZZZ disk stats collection process...');

        // Step 1: Get character data and stats
        console.log('📊 Fetching character data and stats...');
        const charactersData = await getCharactersData();

        // Step 2: Get disk information
        console.log('💿 Fetching disk information...');
        const diskData = await getDiskInformation(charactersData.characterSlugs);

        // Step 3: Merge disk information with character stats
        console.log('🔄 Merging disk information with character stats...');
        const mergedData = mergeData(charactersData.characterStats, diskData);

        // Step 4: Format disk stats
        console.log('📝 Formatting disk stats...');
        const formattedStats = formatDiskStats(mergedData);

        // Save final results
        fs.writeFileSync('disk_stats.json', JSON.stringify(mergedData, null, 2), 'utf-8');
        console.log('✅ Complete data saved to disk_stats.json');

        fs.writeFileSync('formatted_output.txt', formattedStats, 'utf-8');
        console.log('✅ Formatted stats saved to formatted_output.txt');

        console.log('✅ Process completed successfully!');
    } catch (error) {
        console.error('❌ Error in main process:', error);
    }
}

/**
 * Fetch character data and stats from the Prydwen website
 */
async function getCharactersData() {
    try {
        // Get character slugs
        const response = await fetch(`${BASE_URL}/page-data.json`);
        const data = await response.json();
        const characterSlugs = data.result.data.allCharacters.nodes.map(character => character.slug);

        console.log(`🔍 Found ${characterSlugs.length} characters`);

        // Fetch stats for each character
        const characterStats = [];
        const characterSlugsWithNames = [];

        for (const slug of characterSlugs) {
            const response = await fetch(`${BASE_URL}/${slug}/page-data.json`);
            const data = await response.json();
            const unit = data.result.data.currentUnit.nodes[0];

            characterSlugsWithNames.push({ name: unit.fullName, slug });

            const stats = {
                name: unit.fullName,
                stats: unit.build ? {
                    main_4: unit.build.main_4.map(stat => stat.stat),
                    main_5: unit.build.main_5.map(stat => stat.stat),
                    main_6: unit.build.main_6.map(stat => stat.stat),
                    substats: Array.from(new Set(
                        unit.build.substats
                            .replace(/\s+/g, '')
                            .replace(/>=|>|=/g, ", ")
                            .replace(/\(.*?\)/g, '')
                            .replace(/\[|\]/g, '')
                            .replace(/or/g, ',')
                            .split(',')
                    )).join(', ')
                } : null,
                disks: [] // Empty array to be filled later
            };

            characterStats.push(stats);
        }

        console.log(`📊 Retrieved stats for ${characterStats.length} characters`);
        return { characterStats, characterSlugs: characterSlugsWithNames };
    } catch (error) {
        console.error('❌ Error fetching character data:', error);
        throw error;
    }
}

/**
 * Extract disk information from the JavaScript file
 */
async function getDiskInformation(characterSlugs) {
    try {
        // Fetch the JavaScript file
        const response = await fetch(JS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch JS file: ${response.status}`);
        }

        const content = await response.text();
        console.log('📄 JS file fetched successfully');

        // Extract the disk section
        const diskPatternRegex = /},C=t(.*?)\,T=t/s;
        const diskSections = content.match(diskPatternRegex);

        if (!diskSections || diskSections.length < 2) {
            throw new Error('Could not find disk section in JS file');
        }

        const diskSection = diskSections[1];

        // Pattern for extracting disk information
        const diskPattern = /name:"([^"]+)",onProfile/g;
        const extraDisksPattern = /"li",null,r\.createElement\("strong",null,"([^"]+)"\)/g;

        const diskData = {};

        // Extract disks for each character
        for (const char of characterSlugs) {
            const charBlockPattern = new RegExp(`"${char.slug}"===a(.*?)(?:"\\w+"===a|\\)\\})`, 's');
            const charBlockMatch = diskSection.match(charBlockPattern);

            if (!charBlockMatch) {
                console.warn(`⚠️ No block found for ${char.name}`);
                continue;
            }

            const charBlock = charBlockMatch[1];

            // Extract main and additional disks
            const mainDisks = [...charBlock.matchAll(diskPattern)].map(match => match[1]);
            const extraDisks = [...charBlock.matchAll(extraDisksPattern)].map(match => match[1]);

            // Merge and remove duplicates
            const allDisks = [...new Set([...mainDisks, ...extraDisks])];

            // Split any disks that contain a slash
            const splitDisks = allDisks.flatMap(disk => {
                if (disk.includes('/')) {
                    return disk.split('/').map(d => d.trim());
                }
                return [disk.trim()];
            });

            // Remove duplicates again after splitting
            diskData[char.name] = [...new Set(splitDisks)];
        }

        console.log(`💿 Extracted disk information for ${Object.keys(diskData).length} characters`);
        return diskData;
    } catch (error) {
        console.error('❌ Error extracting disk information:', error);
        throw error;
    }
}

/**
 * Merge character stats with disk information
 */
function mergeData(characterStats, diskData) {
    try {
        const mergedData = characterStats.map(stat => {
            const characterName = stat.name;
            if (diskData[characterName]) {
                // Add disks to the corresponding character
                stat.disks = diskData[characterName];
            } else {
                console.warn(`⚠️ No disks found for character: ${characterName}`);
            }
            return stat;
        });

        console.log(`🔄 Merged disk information with character stats`);
        return mergedData;
    } catch (error) {
        console.error('❌ Error merging data:', error);
        throw error;
    }
}

/**
 * Format disk stats for output
 */
function formatDiskStats(data) {
    try {
        // Group stats by disk
        const diskStats = {};

        for (const character of data) {
            const disks = character.disks || [];
            const stats = character.stats;

            if (!stats) continue;

            const main4Stats = stats.main_4 || [];
            const main5Stats = stats.main_5 || [];
            const main6Stats = stats.main_6 || [];
            const substats = (stats.substats || '').split(', ').filter(Boolean);

            for (const disk of disks) {
                if (!diskStats[disk]) {
                    diskStats[disk] = {
                        main_4: {},
                        main_5: {},
                        main_6: {},
                        substats: {}
                    };
                }

                for (const stat of main4Stats) {
                    diskStats[disk].main_4[stat] = (diskStats[disk].main_4[stat] || 0) + 1;
                }

                for (const stat of main5Stats) {
                    diskStats[disk].main_5[stat] = (diskStats[disk].main_5[stat] || 0) + 1;
                }

                for (const stat of main6Stats) {
                    diskStats[disk].main_6[stat] = (diskStats[disk].main_6[stat] || 0) + 1;
                }

                for (const stat of substats) {
                    const trimmedStat = stat.trim();
                    if (trimmedStat) {
                        diskStats[disk].substats[trimmedStat] = (diskStats[disk].substats[trimmedStat] || 0) + 1;
                    }
                }
            }
        }

        // Format the output
        let output = '';

        // Get top counts function
        const getTopCounts = (statsDict, topN) => {
            const sortedItems = Object.entries(statsDict).sort((a, b) => b[1] - a[1]);
            const topCounts = [];
            let currentCount = null;

            for (const [stat, count] of sortedItems) {
                if (topCounts.length < topN) {
                    topCounts.push([stat, count]);
                    currentCount = count;
                } else if (count === currentCount) {
                    topCounts.push([stat, count]);
                } else {
                    break;
                }
            }

            return topCounts;
        };

        // Sort disks alphabetically
        for (const disk of Object.keys(diskStats).sort()) {
            const stats = diskStats[disk];
            output += `**${disk}**\n`;

            // Create summary line
            const topMain4 = getTopCounts(stats.main_4, 2);
            const topMain5 = getTopCounts(stats.main_5, 2);
            const topMain6 = getTopCounts(stats.main_6, 2);
            const topSubstats = getTopCounts(stats.substats, 4);

            output += '\nSummary:';
            output += `\nMain 4: ${topMain4.map(([stat, count]) => `${stat}: ${count}`).join(', ')}, `;
            output += `\nMain 5: ${topMain5.map(([stat, count]) => `${stat}: ${count}`).join(', ')}, `;
            output += `\nMain 6: ${topMain6.map(([stat, count]) => `${stat}: ${count}`).join(', ')}, `;
            output += `\nSubstats: ${topSubstats.map(([stat, count]) => `${stat}: ${count}`).join(', ')}`;
            output += '\n';

            // Add detailed stats
            output += '\nMain 4:\n';
            for (const [stat, count] of Object.entries(stats.main_4).sort((a, b) => b[1] - a[1])) {
                output += `- ${stat} = ${count}\n`;
            }

            output += '\nMain 5:\n';
            for (const [stat, count] of Object.entries(stats.main_5).sort((a, b) => b[1] - a[1])) {
                output += `- ${stat} = ${count}\n`;
            }

            output += '\nMain 6:\n';
            for (const [stat, count] of Object.entries(stats.main_6).sort((a, b) => b[1] - a[1])) {
                output += `- ${stat} = ${count}\n`;
            }

            output += '\nSubstats:\n';
            for (const [stat, count] of Object.entries(stats.substats).sort((a, b) => b[1] - a[1])) {
                output += `- ${stat} = ${count}\n`;
            }

            output += '\n';
        }

        console.log(`📝 Formatted stats for ${Object.keys(diskStats).length} disks`);
        return output;
    } catch (error) {
        console.error('❌ Error formatting disk stats:', error);
        throw error;
    }
}

// Run the main function
main();