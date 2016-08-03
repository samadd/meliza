/* jshint esversion:6 */

'use strict';

function Word(word) {
    this.word = word;
    this.instances = 0;
    this.associatedWords = {};
    this.validNextWords = {};
    this.starts = 0;
    this.ends = 0;
}

function Reader(corpus) {
    
    corpus.$noiseWords = [];
    corpus.$questionWords = {start:[], end:[]};
    
    function getSentences(block) {
        let sentences = [];
        block.split(/[!.?]/g).forEach(sentence => sentences.push(extractWords(sentence)));
        return sentences;
    }
    function extractWords(sentence) {
        return sentence.trim().split(' ').map(word => sanitizeWord(word)).filter(word => word !== "");
    }
    function analyzeWords(sentences) {
        sentences.forEach(
            (s,si) => { 
                s.forEach(
                    (w,i,a) => {
                        //const notwrd = /[^a-zA-Z0-9-]+/g;
                        //let wrd = w.replace(notwrd, '').trim();
                        //let nxtWrd = (i < a.length-1) ? a[i+1].replace(notwrd, '').trim() : null;
                        
                        //let wrd = sanitizeWord(w);
                        let wrd = w;
                        let nxtWrd = (i < a.length-1) ? a[i+1] : null;
                        let word = corpus.hasOwnProperty(wrd) ? corpus[wrd] : new Word(wrd);
                        word.instances++;
                        if (nxtWrd) {
                            word.validNextWords[nxtWrd] = word.validNextWords[nxtWrd] || 0;
                            word.validNextWords[nxtWrd]++;
                        }
                        if (i === 0) {
                            word.starts++;
                        }
                        if (i === a.length-1) {
                            word.ends++;
                        }
                        corpus[wrd] = word;
                    }
                );
            }
        );
    }
    
    function associateWords(sentences) {
        let wC = wordCount(corpus);
        if (wC.length < 60) {
            return;
        }
        let threshold = wC[wC.length - 45].count; console.log(threshold);
        
        sentences.forEach(
            /* find word associations - words with frequency below certain threshold in same sentence (and surrounding?) */
            (s,si,sa) => {
                s.forEach(
                    (w,wi,wa) => {
                        if (corpus[w].instances >= threshold) {
                            if (corpus.$noiseWords.indexOf(w) === -1) {
                                corpus.$noiseWords.push(w);
                            }
                            return;
                        }
                        for (let i = 0; i<wa.length;i++) {
                            if (wa[i]!==w) {
                                if (corpus[wa[i]].instances < threshold) {
                                    corpus[w].associatedWords[wa[i]] = corpus[w].associatedWords[wa[i]] ? ++corpus[w].associatedWords[wa[i]] : 1;
                                }
                            }
                        }
                    }
                );
            }
        );
    }
    
    function findQuestions(block) {
        let questionEnds = block.split('?');
        if (questionEnds.length === 1) { //no questions
            return;
        }
        questionEnds.forEach(
            q => {
                let roughWords = q.split(' '),
                    endWord = sanitizeWord(roughWords[roughWords.length-1]),
                    sBoundary = /[!.?]/;
                if (endWord && corpus.$questionWords.end.indexOf(endWord) === -1) {
                    corpus.$questionWords.end.push(endWord);
                }
                for (let i = roughWords.length-1; i>=0; i--) {
                    if (roughWords[i].match(sBoundary)) {
                        let startWord = sanitizeWord(roughWords[i+1]);
                        if (corpus.$questionWords.start.indexOf(startWord) ==-1) {
                            corpus.$questionWords.start.push(startWord);
                        }
                        break;
                    }
                }
            }
        );
    }
    
    this.learn = (block) => {
        let sentences = getSentences(block);
        analyzeWords(sentences);
        associateWords(sentences);
        findQuestions(block);
    };
}

function Writer(corpus) {
    const PAUSE = "- ";
    let wordStarts = [], wordEnds = [];
    for (let key in corpus) {
        if (corpus[key].starts) {
            wordStarts.push(key);
        }
        if (corpus[key].ends) {
            wordEnds.push(key);
        }
    }
    function writeSentence(minLength, seedWord) {
        let sentence = [], chosenWord, seedList, endPunctuation;
        if (seedWord) {
            chosenWord = getRelevantWord(seedWord, {start:true});
            seedList = getRelevantWords(seedWord);
        } else {
            chosenWord = chooseRandomWord(wordStarts);
        }
        sentence.push(chosenWord);
        while (sentence.length <= minLength || (sentence.length >= minLength && wordEnds.indexOf(chosenWord) === -1)) {
            chosenWord = chooseNextWord(chosenWord, seedList);
            sentence.push(chosenWord);
        }
        endPunctuation = (corpus.$questionWords.start.indexOf(sentence[0]) > -1 && corpus.$questionWords.end.indexOf(sentence[sentence.length-1]) > -1) ? '?' : '.';
        return sentence.reduce((p,c,i,a) => {return p + c + ((i < a.length-1) ? " " : endPunctuation);}, "");
    }
    function chooseRandomWord(wordRange) {
        let rndPoint = Math.floor( Math.random() * wordRange.length);
        return wordRange[rndPoint];
    }
    function getRelevantWords(seed) {
        let relevantWordArray = [], weightedRelevantWordArray, words;
        words = Array.isArray(seed) ? seed : [seed];
        words = words.map((w) => sanitizeWord(w));
        words.forEach(
            (word) => {
                if (corpus[word]) {
                    for (let key in corpus[word].associatedWords) {
                        relevantWordArray.push({w:key,v:corpus[word].associatedWords[key]});
                    }
                    //relevantWordArray.sort((a,b) => b.v - a.v);
                }                
            }
        );
        corpus.$noiseWords.forEach(
            w => {
                relevantWordArray.push({w:w, v: corpus[w].instances});   
            }
        );
        weightedRelevantWordArray = relevantWordArray.reduce((p,c)=>{pushWeightedArray(p,c.w,c.v); return p;},[]);
        return weightedRelevantWordArray;
    }
    function getRelevantWord(word, conditions) {
        let selection = getRelevantWords(word), selected, canStartWords;
        if (conditions && conditions.start) {
            canStartWords = selection.filter(w => corpus[w].starts);
            selected = canStartWords.length ? chooseRandomWord(canStartWords) : word;
        } else {
            selected = selection.length ? chooseRandomWord(selection) : word;
        }
        return selected;
    }
    function chooseNextWord(word, seedList) {
        let found = false, chosenWord = "", wordMap = [];
        seedList = seedList || [];
        word = word.replace(PAUSE, '');
        if (corpus[word]) {
            for (let key in corpus[word].validNextWords) {
                //create weighted array for biased random selection
                let numTimes = corpus[word].validNextWords[key];
                if (seedList.indexOf(key) || !seedList.length) {
                    pushWeightedArray(wordMap, key, numTimes);
                }
            }
        }
        chosenWord = wordMap.length ? chooseRandomWord(wordMap) : PAUSE + chooseRandomWord(wordStarts);
        return chosenWord;
    }
    this.writeSentence = writeSentence;
}

function pushWeightedArray(arr,key,val) {
    for (let i = 0; i < val; i++) {
        arr.push(key);
    }
    return arr;
}

function sanitizeWord(word) {
    if (typeof word !== "string") {
        return "-";
    }
    //return word.trim().toLowerCase();
    return word.trim().toLowerCase().replace(/(^[^a-zA-Z0-9]|[^a-zA-Z0-9]$)/g, "");
}

function wordCount(corpus) {
    let wrdMap = [];
    for (let key in corpus) {
        wrdMap.push({word:key, count:corpus[key].instances});
    }
    return wrdMap.sort((a,b) => a.count-b.count);
}

module.exports = function() {
    let corpus = {};
    return {
        reader: new Reader(corpus),
        Writer: function() {return new Writer(corpus);},
        corpus: {
            view:function() {return corpus;},
            wordCount: function() {return wordCount(corpus);}
        }
    };
};