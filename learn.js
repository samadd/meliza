/* jshint esversion:6 */

'use strict';

function Word(word) {
    this.word = word;
    this.instances = 0;
    this.associatedWords = {};
    this.validNextWords = {};
    this.startPunctuation = [];
    this.endPunctuation = [];
    this.starts = 0;
    this.ends = 0;
}

function Reader(corpus) {
    
    function getSentences(block) {
        let sentences = [];
        block.split('.').forEach(sentence => sentences.push(extractWords(sentence)));
        return sentences;
    }
    function extractWords(sentence) {
        return sentence.trim().split(' ').map(word => word.toLowerCase().trim());
    }
    function analyzeWords(sentences) {
        sentences.forEach(
            s => {
                s.forEach(
                    (w,i,a) => {
                        //const notwrd = /[^a-zA-Z0-9-]+/g;
                        //let wrd = w.replace(notwrd, '').trim();
                        //let nxtWrd = (i < a.length-1) ? a[i+1].replace(notwrd, '').trim() : null;
                        let wrd = w.trim();
                        let nxtWrd = (i < a.length-1) ? a[i+1].trim() : null;
                        let word = corpus[wrd] ? corpus[wrd] : new Word(wrd);
                        word.instances++;
                        if (nxtWrd) {
                            word.validNextWords[nxtWrd] = (word.validNextWords[nxtWrd] || 0);
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
        let threshold = wC[wC.length - 50].count; console.log(threshold);
        
        sentences.forEach(
            /* find word associations - words with frequency below certain threshold in same sentence (and surrounding?) */
            (s,si,sa) => {
                s.forEach(
                    (w,wi,wa) => {
                        if (corpus[w].instances >= threshold) {return;}
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
    this.learn = (block) => {
        let sentences = getSentences(block);
        analyzeWords(sentences);
        associateWords(sentences);
    };
}

function Writer(corpus) {
    const PAUSE = "; ";
    let wordMap = [], wordStarts = [], wordEnds = [];
    for (let key in corpus) {
        wordMap.push(key);
        if (corpus[key].starts) {
            wordStarts.push(key);
        }
        if (corpus[key].ends) {
            wordEnds.push(key);
        }
    }
    function writeSentence(minLength, seedWord) {
        let sentence = [], chosenWord;
        if (seedWord) {
            chosenWord = getRelevantWord(seedWord);
        } else {
            chosenWord = chooseRandomWord(wordStarts);
        }
        
        sentence.push(chosenWord);
        while (sentence.length <= minLength || (sentence.length >= minLength && wordEnds.indexOf(chosenWord) === -1)) {
            chosenWord = chooseNextWord(chosenWord);
            sentence.push(chosenWord);
        } 
        return sentence.reduce((p,c,i,a) => {return p + c + ((i < a.length-1) ? " " : ".");}, "");
    }
    function chooseRandomWord(wordRange) {
        let rndPoint = Math.floor( Math.random() * wordRange.length);
        return wordRange[rndPoint];
    }
    function getRelevantWords(word) {
        let relevantWordArray = [];
        for (let key in corpus[word].associatedWords) {
            relevantWordArray.push({w:key,v:corpus[word].associatedWords[key]});
        }
        relevantWordArray.sort((a,b) => b.v - a.v);
    }
    function getRelevantWord(word, conditions) {
        let selection = getRelevantWords(word), selected;
        if (conditions && conditions.start) {
            selected = selection.find(w => corpus[w].starts);
        }
    }
    function chooseNextWord(word) {
        let found = false, chosenWord = "", wordMap = [];
        word = word.replace(PAUSE, '');
        for (let key in corpus[word].validNextWords) {
            //create weighted array for biased random selection
            let numTimes = corpus[word].validNextWords[key];
            for (let i = 0; i < numTimes; i++) {
                wordMap.push(key);   
            }
        }
        //while (!found && wordMap.length) {
            chosenWord = wordMap.length ? chooseRandomWord(wordMap) : PAUSE + chooseRandomWord(wordStarts);
            //found = corpus[word].validNextWords[chosenWord] ? true : false;
        //}
        return chosenWord;
    }
    this.writeSentence = writeSentence;
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