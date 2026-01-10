const { useState, useEffect, useRef } = React;
const { ChevronRight, ChevronLeft, Play, CheckCircle, BookOpen, Database, Code, Trophy, Star, Zap, Target, Award, Heart, Flame, Lock, Gift, Upload, Ship, Film, Flower2, ShoppingCart, Users, Table, BarChart3, User, LogOut, Save, History, Crown, Medal } = window.LucideIcons || {};

// ============ USER STORAGE HELPERS ============
const saveUserData = async (username, data) => {
  try {
    localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Failed to save user data:', err);
    return false;
  }
};

const loadUserData = async (username) => {
  try {
    const result = localStorage.getItem(`sqlquest_user_${username}`);
    return result ? JSON.parse(result) : null;
  } catch (err) {
    console.error('Failed to load user data:', err);
    return null;
  }
};

const saveToLeaderboard = async (username, xp, solvedCount) => {
  try {
    const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
    leaderboard[username] = { username, xp, solvedCount, timestamp: Date.now() };
    localStorage.setItem('sqlquest_leaderboard', JSON.stringify(leaderboard));
    return true;
  } catch (err) {
    console.error('Failed to save to leaderboard:', err);
    return false;
  }
};

const loadLeaderboard = async () => {
  try {
    const leaderboard = JSON.parse(localStorage.getItem('sqlquest_leaderboard') || '{}');
    return Object.values(leaderboard).sort((a, b) => b.xp - a.xp);
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
    return [];
  }
};

// ============ COMPLETE PUBLIC DATASETS ============

const publicDatasets = {
  titanic: {
    name: "Titanic Passengers",
    icon: Ship,
    description: "891 passengers from the Titanic disaster - Classic Kaggle ML dataset",
    source: "Kaggle",
    tables: {
      passengers: {
        columns: ["passenger_id", "survived", "pclass", "name", "sex", "age", "sibsp", "parch", "fare", "embarked"],
        data: [
          [1,0,3,"Braund, Mr. Owen Harris","male",22,1,0,7.25,"S"],
          [2,1,1,"Cumings, Mrs. John Bradley","female",38,1,0,71.28,"C"],
          [3,1,3,"Heikkinen, Miss. Laina","female",26,0,0,7.92,"S"],
          [4,1,1,"Futrelle, Mrs. Jacques Heath","female",35,1,0,53.1,"S"],
          [5,0,3,"Allen, Mr. William Henry","male",35,0,0,8.05,"S"],
          [6,0,3,"Moran, Mr. James","male",null,0,0,8.46,"Q"],
          [7,0,1,"McCarthy, Mr. Timothy J","male",54,0,0,51.86,"S"],
          [8,0,3,"Palsson, Master. Gosta Leonard","male",2,3,1,21.07,"S"],
          [9,1,3,"Johnson, Mrs. Oscar W","female",27,0,2,11.13,"S"],
          [10,1,2,"Nasser, Mrs. Nicholas","female",14,1,0,30.07,"C"],
          [11,1,3,"Sandstrom, Miss. Marguerite Rut","female",4,1,1,16.7,"S"],
          [12,1,1,"Bonnell, Miss. Elizabeth","female",58,0,0,26.55,"S"],
          [13,0,3,"Saundercock, Mr. William Henry","male",20,0,0,8.05,"S"],
          [14,0,3,"Andersson, Mr. Anders Johan","male",39,1,5,31.27,"S"],
          [15,0,3,"Vestrom, Miss. Hulda Amanda","female",14,0,0,7.85,"S"],
          [16,1,2,"Hewlett, Mrs. Mary D Kingcome","female",55,0,0,16,"S"],
          [17,0,3,"Rice, Master. Eugene","male",2,4,1,29.12,"Q"],
          [18,1,2,"Williams, Mr. Charles Eugene","male",null,0,0,13,"S"],
          [19,0,3,"Vander Planke, Mrs. Julius","female",31,1,0,18,"S"],
          [20,1,3,"Masselmani, Mrs. Fatima","female",null,0,0,7.22,"C"],
          [21,0,2,"Fynney, Mr. Joseph J","male",35,0,0,26,"S"],
          [22,1,2,"Beesley, Mr. Lawrence","male",34,0,0,13,"S"],
          [23,1,3,"McGowan, Miss. Anna","female",15,0,0,8.03,"Q"],
          [24,1,1,"Sloper, Mr. William Thompson","male",28,0,0,35.5,"S"],
          [25,0,3,"Palsson, Miss. Torborg Danira","female",8,3,1,21.07,"S"],
          [26,1,3,"Asplund, Mrs. Carl Oscar","female",38,1,5,31.39,"S"],
          [27,0,3,"Emir, Mr. Farred Chehab","male",null,0,0,7.22,"C"],
          [28,0,1,"Fortune, Mr. Charles Alexander","male",19,3,2,263,"S"],
          [29,1,3,"Dwyer, Miss. Ellen","female",null,0,0,7.88,"Q"],
          [30,0,3,"Todoroff, Mr. Lalio","male",null,0,0,7.9,"S"],
          [31,0,1,"Uruchurtu, Don. Manuel E","male",40,0,0,27.72,"C"],
          [32,1,1,"Spencer, Mrs. William Augustus","female",null,1,0,146.52,"C"],
          [33,1,3,"Glynn, Miss. Mary Agatha","female",null,0,0,7.75,"Q"],
          [34,0,2,"Wheadon, Mr. Edward H","male",66,0,0,10.5,"S"],
          [35,0,1,"Meyer, Mr. Edgar Joseph","male",28,1,0,82.17,"C"],
          [36,0,1,"Holverson, Mr. Alexander Oskar","male",42,1,0,52,"S"],
          [37,1,3,"Mamee, Mr. Hanna","male",null,0,0,7.23,"C"],
          [38,0,3,"Cann, Mr. Ernest Charles","male",21,0,0,8.05,"S"],
          [39,0,3,"Vander Planke, Miss. Augusta","female",18,2,0,18,"S"],
          [40,1,3,"Nicola-Yarred, Miss. Jamila","female",14,1,0,11.24,"C"],
          [41,0,3,"Ahlin, Mrs. Johan","female",40,1,0,9.48,"S"],
          [42,0,2,"Turpin, Mrs. William John Robert","female",27,1,0,21,"S"],
          [43,0,3,"Kraeff, Mr. Theodor","male",null,0,0,7.9,"C"],
          [44,1,2,"Laroche, Miss. Simonne Marie Anne","female",3,1,2,41.58,"C"],
          [45,1,3,"Devaney, Miss. Margaret Delia","female",19,0,0,7.88,"Q"],
          [46,0,3,"Rogers, Mr. William John","male",null,0,0,8.05,"S"],
          [47,0,3,"Lennon, Mr. Denis","male",null,1,0,15.5,"Q"],
          [48,1,3,"O'Driscoll, Miss. Bridget","female",null,0,0,7.75,"Q"],
          [49,0,3,"Samaan, Mr. Youssef","male",null,2,0,21.68,"C"],
          [50,0,3,"Arnold-Franchi, Mrs. Josef","female",18,1,0,17.8,"S"],
          [51,0,3,"Panula, Master. Juha Niilo","male",7,4,1,39.69,"S"],
          [52,0,3,"Nosworthy, Mr. Richard Cater","male",21,0,0,7.8,"S"],
          [53,1,1,"Harper, Mrs. Henry Sleeper","female",49,1,0,76.73,"S"],
          [54,1,2,"Faunthorpe, Mrs. Lizzie","female",29,1,0,26,"S"],
          [55,0,1,"Ostby, Mr. Engelhart Cornelius","male",65,0,1,61.98,"S"],
          [56,1,1,"Woolner, Mr. Hugh","male",null,0,0,35.5,"S"],
          [57,1,2,"Rugg, Miss. Emily","female",21,0,0,10.5,"S"],
          [58,0,3,"Novel, Mr. Mansouer","male",28.5,0,0,7.23,"C"],
          [59,1,2,"West, Miss. Constance Mirium","female",5,1,2,27.75,"S"],
          [60,0,3,"Goodwin, Master. William Frederick","male",11,5,2,46.9,"S"],
          [61,0,3,"Sirayanian, Mr. Orsen","male",22,0,0,7.23,"C"],
          [62,1,1,"Icard, Miss. Amelie","female",38,0,0,80,""],
          [63,0,1,"Harris, Mr. Henry Birkhardt","male",45,1,0,83.48,"S"],
          [64,0,3,"Skoog, Master. Harald","male",4,3,2,27.9,"S"],
          [65,0,1,"Stewart, Mr. Albert A","male",null,0,0,27.72,"S"],
          [66,1,3,"Moubarek, Master. Gerios","male",null,1,1,15.25,"C"],
          [67,1,2,"Nye, Mrs. Elizabeth Ramell","female",29,0,0,10.5,"S"],
          [68,0,3,"Crease, Mr. Ernest James","male",19,0,0,8.16,"S"],
          [69,1,3,"Andersson, Miss. Erna Alexandra","female",17,4,2,7.93,"S"],
          [70,0,3,"Kink, Mr. Vincenz","male",26,2,0,8.66,"S"],
          [71,0,2,"Jenkin, Mr. Stephen Curnow","male",32,0,0,10.5,"S"],
          [72,0,3,"Goodwin, Miss. Lillian Amy","female",16,5,2,46.9,"S"],
          [73,0,2,"Hood, Mr. Ambrose Jr","male",21,0,0,73.5,"S"],
          [74,0,3,"Chronopoulos, Mr. Apostolos","male",26,1,0,14.45,"S"],
          [75,1,3,"Bing, Mr. Lee","male",32,0,0,56.5,"S"],
          [76,0,3,"Moen, Mr. Sigurd Hansen","male",25,0,0,7.65,"S"],
          [77,0,3,"Staneff, Mr. Ivan","male",null,0,0,7.9,"S"],
          [78,0,3,"Moutal, Mr. Rahamin Haim","male",null,0,0,8.05,"S"],
          [79,1,2,"Caldwell, Master. Alden Gates","male",0.83,0,2,29,"S"],
          [80,1,3,"Dowdell, Miss. Elizabeth","female",30,0,0,12.48,"S"],
          [81,0,3,"Waelens, Mr. Achille","male",22,0,0,9,"S"],
          [82,1,3,"Sheerlinck, Mr. Jan Baptist","male",29,0,0,9.5,"S"],
          [83,1,3,"McDermott, Miss. Brigdet Delia","female",null,0,0,7.79,"Q"],
          [84,0,1,"Carrau, Mr. Francisco M","male",28,0,0,47.1,"S"],
          [85,1,2,"Ilett, Miss. Bertha","female",17,0,0,10.5,"S"],
          [86,1,3,"Backstrom, Mrs. Karl Alfred","female",33,3,0,15.85,"S"],
          [87,0,3,"Ford, Mr. William Neal","male",16,1,3,34.38,"S"],
          [88,0,3,"Slocovski, Mr. Selman Francis","male",null,0,0,8.05,"S"],
          [89,1,1,"Fortune, Miss. Mabel Helen","female",23,3,2,263,"S"],
          [90,0,3,"Celotti, Mr. Francesco","male",24,0,0,8.05,"S"],
          [91,0,3,"Christmann, Mr. Emil","male",29,0,0,8.05,"S"],
          [92,0,3,"Andreasson, Mr. Paul Edvin","male",20,0,0,7.85,"S"],
          [93,0,1,"Chaffee, Mr. Herbert Fuller","male",46,1,0,61.18,"S"],
          [94,0,3,"Dean, Mr. Bertram Frank","male",26,1,2,20.58,"S"],
          [95,0,3,"Coxon, Mr. Daniel","male",59,0,0,7.25,"S"],
          [96,0,3,"Shorney, Mr. Charles Joseph","male",null,0,0,8.05,"S"],
          [97,0,1,"Goldschmidt, Mr. George B","male",71,0,0,34.65,"C"],
          [98,1,1,"Greenfield, Mr. William Bertram","male",23,0,1,63.36,"C"],
          [99,1,2,"Doling, Mrs. John T","female",34,0,1,23,"S"],
          [100,0,2,"Kantor, Mr. Sinai","male",34,1,0,26,"S"]
        ]
      }
    },
    suggestedQueries: [
      "SELECT * FROM passengers LIMIT 10",
      "SELECT sex, COUNT(*) as count, AVG(age) as avg_age FROM passengers GROUP BY sex",
      "SELECT pclass, survived, COUNT(*) as count FROM passengers GROUP BY pclass, survived",
      "SELECT * FROM passengers WHERE survived = 1 AND sex = 'female' ORDER BY age DESC",
      "SELECT embarked, COUNT(*) as passengers, AVG(fare) as avg_fare FROM passengers WHERE embarked IS NOT NULL GROUP BY embarked",
    ]
  },
  
  movies: {
    name: "Top 100 Movies",
    icon: Film,
    description: "100 highest-rated movies with box office data",
    source: "IMDB/TMDB",
    tables: {
      movies: {
        columns: ["id", "title", "year", "genre", "rating", "votes", "revenue_millions", "runtime", "director"],
        data: [
          [1,"The Shawshank Redemption",1994,"Drama",9.3,2500000,58.3,142,"Frank Darabont"],
          [2,"The Godfather",1972,"Crime",9.2,1800000,246.1,175,"Francis Ford Coppola"],
          [3,"The Dark Knight",2008,"Action",9.0,2400000,1004.6,152,"Christopher Nolan"],
          [4,"The Godfather Part II",1974,"Crime",9.0,1200000,93.0,202,"Francis Ford Coppola"],
          [5,"12 Angry Men",1957,"Drama",9.0,750000,4.4,96,"Sidney Lumet"],
          [6,"Schindler's List",1993,"Drama",8.9,1300000,322.2,195,"Steven Spielberg"],
          [7,"The Lord of the Rings: Return of the King",2003,"Fantasy",8.9,1700000,1142.0,201,"Peter Jackson"],
          [8,"Pulp Fiction",1994,"Crime",8.9,1900000,213.9,154,"Quentin Tarantino"],
          [9,"Fight Club",1999,"Drama",8.8,2000000,101.2,139,"David Fincher"],
          [10,"Forrest Gump",1994,"Drama",8.8,1900000,677.9,142,"Robert Zemeckis"],
          [11,"Inception",2010,"Sci-Fi",8.8,2200000,829.9,148,"Christopher Nolan"],
          [12,"The Lord of the Rings: Fellowship",2001,"Fantasy",8.8,1700000,898.2,178,"Peter Jackson"],
          [13,"The Matrix",1999,"Sci-Fi",8.7,1800000,463.5,136,"Wachowski Sisters"],
          [14,"Goodfellas",1990,"Crime",8.7,1100000,46.8,146,"Martin Scorsese"],
          [15,"Star Wars: Empire Strikes Back",1980,"Sci-Fi",8.7,1200000,538.4,124,"Irvin Kershner"],
          [16,"One Flew Over the Cuckoo's Nest",1975,"Drama",8.7,950000,112.0,133,"Milos Forman"],
          [17,"Interstellar",2014,"Sci-Fi",8.6,1600000,677.5,169,"Christopher Nolan"],
          [18,"City of God",2002,"Crime",8.6,720000,30.6,130,"Fernando Meirelles"],
          [19,"Spirited Away",2001,"Animation",8.6,680000,347.0,125,"Hayao Miyazaki"],
          [20,"Saving Private Ryan",1998,"War",8.6,1300000,481.8,169,"Steven Spielberg"],
          [21,"The Silence of the Lambs",1991,"Thriller",8.6,1300000,272.7,118,"Jonathan Demme"],
          [22,"Life Is Beautiful",1997,"Drama",8.6,670000,229.2,116,"Roberto Benigni"],
          [23,"The Green Mile",1999,"Drama",8.6,1200000,286.8,189,"Frank Darabont"],
          [24,"Se7en",1995,"Thriller",8.6,1500000,327.3,127,"David Fincher"],
          [25,"The Usual Suspects",1995,"Thriller",8.5,1000000,23.3,106,"Bryan Singer"],
          [26,"Léon: The Professional",1994,"Action",8.5,1100000,45.3,110,"Luc Besson"],
          [27,"Gladiator",2000,"Action",8.5,1400000,457.6,155,"Ridley Scott"],
          [28,"The Departed",2006,"Crime",8.5,1200000,291.5,151,"Martin Scorsese"],
          [29,"The Prestige",2006,"Thriller",8.5,1200000,109.7,130,"Christopher Nolan"],
          [30,"Whiplash",2014,"Drama",8.5,800000,49.0,106,"Damien Chazelle"],
          [31,"The Intouchables",2011,"Comedy",8.5,800000,426.6,112,"Olivier Nakache"],
          [32,"The Lion King",1994,"Animation",8.5,1000000,968.5,88,"Roger Allers"],
          [33,"Memento",2000,"Thriller",8.4,1200000,39.7,113,"Christopher Nolan"],
          [34,"Apocalypse Now",1979,"War",8.4,650000,150.0,147,"Francis Ford Coppola"],
          [35,"Alien",1979,"Sci-Fi",8.4,850000,203.6,117,"Ridley Scott"],
          [36,"Django Unchained",2012,"Western",8.4,1400000,425.4,165,"Quentin Tarantino"],
          [37,"WALL-E",2008,"Animation",8.4,1000000,533.3,98,"Andrew Stanton"],
          [38,"The Lives of Others",2006,"Drama",8.4,380000,77.4,137,"Florian Henckel"],
          [39,"Grave of the Fireflies",1988,"Animation",8.4,260000,0.5,89,"Isao Takahata"],
          [40,"Paths of Glory",1957,"War",8.4,180000,0.4,88,"Stanley Kubrick"],
          [41,"The Shining",1980,"Horror",8.4,950000,44.0,146,"Stanley Kubrick"],
          [42,"Princess Mononoke",1997,"Animation",8.4,370000,159.4,134,"Hayao Miyazaki"],
          [43,"Avengers: Endgame",2019,"Action",8.4,1000000,2797.8,181,"Russo Brothers"],
          [44,"Joker",2019,"Drama",8.4,1100000,1074.3,122,"Todd Phillips"],
          [45,"Your Name",2016,"Animation",8.4,250000,380.1,106,"Makoto Shinkai"],
          [46,"Parasite",2019,"Thriller",8.6,700000,263.1,132,"Bong Joon-ho"],
          [47,"Oldboy",2003,"Thriller",8.4,550000,15.0,120,"Park Chan-wook"],
          [48,"Once Upon a Time in the West",1968,"Western",8.4,320000,5.3,165,"Sergio Leone"],
          [49,"Coco",2017,"Animation",8.4,500000,807.1,105,"Lee Unkrich"],
          [50,"Rear Window",1954,"Thriller",8.4,470000,36.8,112,"Alfred Hitchcock"],
          [51,"The Pianist",2002,"Drama",8.5,780000,120.1,150,"Roman Polanski"],
          [52,"Terminator 2",1991,"Action",8.5,1000000,520.9,137,"James Cameron"],
          [53,"Back to the Future",1985,"Sci-Fi",8.5,1100000,381.1,116,"Robert Zemeckis"],
          [54,"Psycho",1960,"Horror",8.5,630000,50.0,109,"Alfred Hitchcock"],
          [55,"American History X",1998,"Drama",8.5,1000000,23.9,119,"Tony Kaye"],
          [56,"Casablanca",1942,"Drama",8.5,540000,10.5,102,"Michael Curtiz"],
          [57,"Modern Times",1936,"Comedy",8.5,230000,1.8,87,"Charlie Chaplin"],
          [58,"Raiders of the Lost Ark",1981,"Action",8.4,920000,389.9,115,"Steven Spielberg"],
          [59,"Spider-Man: Into the Spider-Verse",2018,"Animation",8.4,450000,375.5,117,"Peter Ramsey"],
          [60,"Braveheart",1995,"Drama",8.3,1000000,210.4,178,"Mel Gibson"],
          [61,"The Wolf of Wall Street",2013,"Comedy",8.2,1300000,392.0,180,"Martin Scorsese"],
          [62,"Good Will Hunting",1997,"Drama",8.3,900000,225.9,126,"Gus Van Sant"],
          [63,"Requiem for a Dream",2000,"Drama",8.3,780000,7.4,102,"Darren Aronofsky"],
          [64,"Toy Story",1995,"Animation",8.3,920000,373.6,81,"John Lasseter"],
          [65,"Singin' in the Rain",1952,"Musical",8.3,230000,8.8,103,"Stanley Donen"],
          [66,"Vertigo",1958,"Thriller",8.3,380000,7.3,128,"Alfred Hitchcock"],
          [67,"Reservoir Dogs",1992,"Crime",8.3,960000,2.9,99,"Quentin Tarantino"],
          [68,"Amelie",2001,"Comedy",8.3,720000,174.2,122,"Jean-Pierre Jeunet"],
          [69,"A Clockwork Orange",1971,"Sci-Fi",8.3,780000,26.6,136,"Stanley Kubrick"],
          [70,"Taxi Driver",1976,"Crime",8.2,780000,28.3,114,"Martin Scorsese"],
          [71,"Full Metal Jacket",1987,"War",8.3,720000,46.4,116,"Stanley Kubrick"],
          [72,"Inglourious Basterds",2009,"War",8.3,1300000,321.5,153,"Quentin Tarantino"],
          [73,"2001: A Space Odyssey",1968,"Sci-Fi",8.3,620000,68.7,149,"Stanley Kubrick"],
          [74,"Snatch",2000,"Crime",8.3,800000,83.6,102,"Guy Ritchie"],
          [75,"The Great Dictator",1940,"Comedy",8.4,210000,5.0,125,"Charlie Chaplin"],
          [76,"Eternal Sunshine",2004,"Romance",8.3,950000,72.3,108,"Michel Gondry"],
          [77,"Toy Story 3",2010,"Animation",8.2,780000,1067.0,103,"Lee Unkrich"],
          [78,"Amadeus",1984,"Drama",8.3,380000,90.0,160,"Milos Forman"],
          [79,"To Kill a Mockingbird",1962,"Drama",8.3,300000,13.1,129,"Robert Mulligan"],
          [80,"Lawrence of Arabia",1962,"Drama",8.3,280000,70.0,218,"David Lean"],
          [81,"The Sting",1973,"Crime",8.3,260000,159.6,129,"George Roy Hill"],
          [82,"3 Idiots",2009,"Comedy",8.4,380000,6.5,170,"Rajkumar Hirani"],
          [83,"Batman Begins",2005,"Action",8.2,1400000,374.2,140,"Christopher Nolan"],
          [84,"Cinema Paradiso",1988,"Drama",8.5,250000,11.9,155,"Giuseppe Tornatore"],
          [85,"Up",2009,"Animation",8.2,980000,735.1,96,"Pete Docter"],
          [86,"Once Upon a Time in America",1984,"Crime",8.3,320000,5.3,229,"Sergio Leone"],
          [87,"Heat",1995,"Crime",8.2,650000,187.4,170,"Michael Mann"],
          [88,"Chinatown",1974,"Thriller",8.2,310000,30.0,130,"Roman Polanski"],
          [89,"Inside Out",2015,"Animation",8.1,660000,857.6,95,"Pete Docter"],
          [90,"Monty Python Holy Grail",1975,"Comedy",8.2,520000,5.0,91,"Terry Gilliam"],
          [91,"The Apartment",1960,"Comedy",8.3,170000,24.6,125,"Billy Wilder"],
          [92,"L.A. Confidential",1997,"Crime",8.2,580000,126.2,138,"Curtis Hanson"],
          [93,"Ratatouille",2007,"Animation",8.0,720000,623.7,111,"Brad Bird"],
          [94,"Die Hard",1988,"Action",8.2,830000,140.8,132,"John McTiernan"],
          [95,"Downfall",2004,"Drama",8.2,350000,92.2,156,"Oliver Hirschbiegel"],
          [96,"A Beautiful Mind",2001,"Drama",8.2,890000,313.5,135,"Ron Howard"],
          [97,"The Truman Show",1998,"Drama",8.1,980000,264.1,103,"Peter Weir"],
          [98,"No Country for Old Men",2007,"Thriller",8.1,900000,171.6,122,"Coen Brothers"],
          [99,"Kill Bill: Vol. 1",2003,"Action",8.1,1000000,180.9,111,"Quentin Tarantino"],
          [100,"There Will Be Blood",2007,"Drama",8.2,550000,76.2,158,"Paul Thomas Anderson"]
        ]
      }
    },
    suggestedQueries: [
      "SELECT * FROM movies ORDER BY rating DESC LIMIT 10",
      "SELECT genre, COUNT(*) as count, ROUND(AVG(rating),2) as avg_rating FROM movies GROUP BY genre ORDER BY count DESC",
      "SELECT director, COUNT(*) as films, ROUND(AVG(rating),2) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 3 ORDER BY avg_rating DESC",
      "SELECT * FROM movies WHERE year >= 2010 ORDER BY revenue_millions DESC LIMIT 10",
      "SELECT year, COUNT(*) as films, ROUND(AVG(revenue_millions),1) as avg_revenue FROM movies GROUP BY year ORDER BY year DESC",
    ]
  },

  iris: {
    name: "Iris Flowers",
    icon: Flower2,
    description: "Complete 150-sample Iris dataset - Classic ML benchmark",
    source: "UCI ML Repository",
    tables: {
      flowers: {
        columns: ["id", "sepal_length", "sepal_width", "petal_length", "petal_width", "species"],
        data: [
          [1,5.1,3.5,1.4,0.2,"setosa"],[2,4.9,3.0,1.4,0.2,"setosa"],[3,4.7,3.2,1.3,0.2,"setosa"],
          [4,4.6,3.1,1.5,0.2,"setosa"],[5,5.0,3.6,1.4,0.2,"setosa"],[6,5.4,3.9,1.7,0.4,"setosa"],
          [7,4.6,3.4,1.4,0.3,"setosa"],[8,5.0,3.4,1.5,0.2,"setosa"],[9,4.4,2.9,1.4,0.2,"setosa"],
          [10,4.9,3.1,1.5,0.1,"setosa"],[11,5.4,3.7,1.5,0.2,"setosa"],[12,4.8,3.4,1.6,0.2,"setosa"],
          [13,4.8,3.0,1.4,0.1,"setosa"],[14,4.3,3.0,1.1,0.1,"setosa"],[15,5.8,4.0,1.2,0.2,"setosa"],
          [16,5.7,4.4,1.5,0.4,"setosa"],[17,5.4,3.9,1.3,0.4,"setosa"],[18,5.1,3.5,1.4,0.3,"setosa"],
          [19,5.7,3.8,1.7,0.3,"setosa"],[20,5.1,3.8,1.5,0.3,"setosa"],[21,5.4,3.4,1.7,0.2,"setosa"],
          [22,5.1,3.7,1.5,0.4,"setosa"],[23,4.6,3.6,1.0,0.2,"setosa"],[24,5.1,3.3,1.7,0.5,"setosa"],
          [25,4.8,3.4,1.9,0.2,"setosa"],[26,5.0,3.0,1.6,0.2,"setosa"],[27,5.0,3.4,1.6,0.4,"setosa"],
          [28,5.2,3.5,1.5,0.2,"setosa"],[29,5.2,3.4,1.4,0.2,"setosa"],[30,4.7,3.2,1.6,0.2,"setosa"],
          [31,4.8,3.1,1.6,0.2,"setosa"],[32,5.4,3.4,1.5,0.4,"setosa"],[33,5.2,4.1,1.5,0.1,"setosa"],
          [34,5.5,4.2,1.4,0.2,"setosa"],[35,4.9,3.1,1.5,0.2,"setosa"],[36,5.0,3.2,1.2,0.2,"setosa"],
          [37,5.5,3.5,1.3,0.2,"setosa"],[38,4.9,3.6,1.4,0.1,"setosa"],[39,4.4,3.0,1.3,0.2,"setosa"],
          [40,5.1,3.4,1.5,0.2,"setosa"],[41,5.0,3.5,1.3,0.3,"setosa"],[42,4.5,2.3,1.3,0.3,"setosa"],
          [43,4.4,3.2,1.3,0.2,"setosa"],[44,5.0,3.5,1.6,0.6,"setosa"],[45,5.1,3.8,1.9,0.4,"setosa"],
          [46,4.8,3.0,1.4,0.3,"setosa"],[47,5.1,3.8,1.6,0.2,"setosa"],[48,4.6,3.2,1.4,0.2,"setosa"],
          [49,5.3,3.7,1.5,0.2,"setosa"],[50,5.0,3.3,1.4,0.2,"setosa"],
          [51,7.0,3.2,4.7,1.4,"versicolor"],[52,6.4,3.2,4.5,1.5,"versicolor"],[53,6.9,3.1,4.9,1.5,"versicolor"],
          [54,5.5,2.3,4.0,1.3,"versicolor"],[55,6.5,2.8,4.6,1.5,"versicolor"],[56,5.7,2.8,4.5,1.3,"versicolor"],
          [57,6.3,3.3,4.7,1.6,"versicolor"],[58,4.9,2.4,3.3,1.0,"versicolor"],[59,6.6,2.9,4.6,1.3,"versicolor"],
          [60,5.2,2.7,3.9,1.4,"versicolor"],[61,5.0,2.0,3.5,1.0,"versicolor"],[62,5.9,3.0,4.2,1.5,"versicolor"],
          [63,6.0,2.2,4.0,1.0,"versicolor"],[64,6.1,2.9,4.7,1.4,"versicolor"],[65,5.6,2.9,3.6,1.3,"versicolor"],
          [66,6.7,3.1,4.4,1.4,"versicolor"],[67,5.6,3.0,4.5,1.5,"versicolor"],[68,5.8,2.7,4.1,1.0,"versicolor"],
          [69,6.2,2.2,4.5,1.5,"versicolor"],[70,5.6,2.5,3.9,1.1,"versicolor"],[71,5.9,3.2,4.8,1.8,"versicolor"],
          [72,6.1,2.8,4.0,1.3,"versicolor"],[73,6.3,2.5,4.9,1.5,"versicolor"],[74,6.1,2.8,4.7,1.2,"versicolor"],
          [75,6.4,2.9,4.3,1.3,"versicolor"],[76,6.6,3.0,4.4,1.4,"versicolor"],[77,6.8,2.8,4.8,1.4,"versicolor"],
          [78,6.7,3.0,5.0,1.7,"versicolor"],[79,6.0,2.9,4.5,1.5,"versicolor"],[80,5.7,2.6,3.5,1.0,"versicolor"],
          [81,5.5,2.4,3.8,1.1,"versicolor"],[82,5.5,2.4,3.7,1.0,"versicolor"],[83,5.8,2.7,3.9,1.2,"versicolor"],
          [84,6.0,2.7,5.1,1.6,"versicolor"],[85,5.4,3.0,4.5,1.5,"versicolor"],[86,6.0,3.4,4.5,1.6,"versicolor"],
          [87,6.7,3.1,4.7,1.5,"versicolor"],[88,6.3,2.3,4.4,1.3,"versicolor"],[89,5.6,3.0,4.1,1.3,"versicolor"],
          [90,5.5,2.5,4.0,1.3,"versicolor"],[91,5.5,2.6,4.4,1.2,"versicolor"],[92,6.1,3.0,4.6,1.4,"versicolor"],
          [93,5.8,2.6,4.0,1.2,"versicolor"],[94,5.0,2.3,3.3,1.0,"versicolor"],[95,5.6,2.7,4.2,1.3,"versicolor"],
          [96,5.7,3.0,4.2,1.2,"versicolor"],[97,5.7,2.9,4.2,1.3,"versicolor"],[98,6.2,2.9,4.3,1.3,"versicolor"],
          [99,5.1,2.5,3.0,1.1,"versicolor"],[100,5.7,2.8,4.1,1.3,"versicolor"],
          [101,6.3,3.3,6.0,2.5,"virginica"],[102,5.8,2.7,5.1,1.9,"virginica"],[103,7.1,3.0,5.9,2.1,"virginica"],
          [104,6.3,2.9,5.6,1.8,"virginica"],[105,6.5,3.0,5.8,2.2,"virginica"],[106,7.6,3.0,6.6,2.1,"virginica"],
          [107,4.9,2.5,4.5,1.7,"virginica"],[108,7.3,2.9,6.3,1.8,"virginica"],[109,6.7,2.5,5.8,1.8,"virginica"],
          [110,7.2,3.6,6.1,2.5,"virginica"],[111,6.5,3.2,5.1,2.0,"virginica"],[112,6.4,2.7,5.3,1.9,"virginica"],
          [113,6.8,3.0,5.5,2.1,"virginica"],[114,5.7,2.5,5.0,2.0,"virginica"],[115,5.8,2.8,5.1,2.4,"virginica"],
          [116,6.4,3.2,5.3,2.3,"virginica"],[117,6.5,3.0,5.5,1.8,"virginica"],[118,7.7,3.8,6.7,2.2,"virginica"],
          [119,7.7,2.6,6.9,2.3,"virginica"],[120,6.0,2.2,5.0,1.5,"virginica"],[121,6.9,3.2,5.7,2.3,"virginica"],
          [122,5.6,2.8,4.9,2.0,"virginica"],[123,7.7,2.8,6.7,2.0,"virginica"],[124,6.3,2.7,4.9,1.8,"virginica"],
          [125,6.7,3.3,5.7,2.1,"virginica"],[126,7.2,3.2,6.0,1.8,"virginica"],[127,6.2,2.8,4.8,1.8,"virginica"],
          [128,6.1,3.0,4.9,1.8,"virginica"],[129,6.4,2.8,5.6,2.1,"virginica"],[130,7.2,3.0,5.8,1.6,"virginica"],
          [131,7.4,2.8,6.1,1.9,"virginica"],[132,7.9,3.8,6.4,2.0,"virginica"],[133,6.4,2.8,5.6,2.2,"virginica"],
          [134,6.3,2.8,5.1,1.5,"virginica"],[135,6.1,2.6,5.6,1.4,"virginica"],[136,7.7,3.0,6.1,2.3,"virginica"],
          [137,6.3,3.4,5.6,2.4,"virginica"],[138,6.4,3.1,5.5,1.8,"virginica"],[139,6.0,3.0,4.8,1.8,"virginica"],
          [140,6.9,3.1,5.4,2.1,"virginica"],[141,6.7,3.1,5.6,2.4,"virginica"],[142,6.9,3.1,5.1,2.3,"virginica"],
          [143,5.8,2.7,5.1,1.9,"virginica"],[144,6.8,3.2,5.9,2.3,"virginica"],[145,6.7,3.3,5.7,2.5,"virginica"],
          [146,6.7,3.0,5.2,2.3,"virginica"],[147,6.3,2.5,5.0,1.9,"virginica"],[148,6.5,3.0,5.2,2.0,"virginica"],
          [149,6.2,3.4,5.4,2.3,"virginica"],[150,5.9,3.0,5.1,1.8,"virginica"]
        ]
      }
    },
    suggestedQueries: [
      "SELECT species, COUNT(*) as count FROM flowers GROUP BY species",
      "SELECT species, ROUND(AVG(petal_length),2) as avg_petal_length, ROUND(AVG(petal_width),2) as avg_petal_width FROM flowers GROUP BY species",
      "SELECT * FROM flowers WHERE species = 'virginica' ORDER BY petal_length DESC LIMIT 5",
      "SELECT species, MIN(sepal_length) as min_sepal, MAX(sepal_length) as max_sepal FROM flowers GROUP BY species",
      "SELECT * FROM flowers WHERE petal_length > 5 ORDER BY petal_length DESC",
    ]
  },

  ecommerce: {
    name: "E-Commerce Sales",
    icon: ShoppingCart,
    description: "100 transactions with customer data across multiple countries",
    source: "Sample Data",
    tables: {
      orders: {
        columns: ["order_id", "customer_id", "product", "category", "quantity", "price", "order_date", "country"],
        data: [
          [1001,101,"Wireless Mouse","Electronics",2,29.99,"2024-01-15","USA"],
          [1002,102,"USB-C Cable","Electronics",5,12.99,"2024-01-15","Canada"],
          [1003,103,"Notebook Set","Office",3,15.99,"2024-01-16","UK"],
          [1004,101,"Mechanical Keyboard","Electronics",1,89.99,"2024-01-16","USA"],
          [1005,104,"Desk Lamp","Home",1,34.99,"2024-01-17","Germany"],
          [1006,105,"Webcam HD","Electronics",1,59.99,"2024-01-17","USA"],
          [1007,102,"Mouse Pad XL","Electronics",2,19.99,"2024-01-18","Canada"],
          [1008,106,"Office Chair","Furniture",1,199.99,"2024-01-18","USA"],
          [1009,107,"Monitor Stand","Furniture",1,45.99,"2024-01-19","UK"],
          [1010,103,"Pen Set","Office",4,8.99,"2024-01-19","UK"],
          [1011,108,"Laptop Stand","Electronics",1,39.99,"2024-01-20","France"],
          [1012,101,"Headphones","Electronics",1,149.99,"2024-01-20","USA"],
          [1013,109,"Desk Organizer","Office",2,24.99,"2024-01-21","Germany"],
          [1014,110,"Smart Speaker","Electronics",1,79.99,"2024-01-21","USA"],
          [1015,104,"Plant Pot","Home",3,12.99,"2024-01-22","Germany"],
          [1016,111,"Filing Cabinet","Furniture",1,129.99,"2024-01-22","Canada"],
          [1017,102,"HDMI Cable","Electronics",3,14.99,"2024-01-23","Canada"],
          [1018,112,"Desk Mat","Office",1,29.99,"2024-01-23","Australia"],
          [1019,105,"Ring Light","Electronics",1,44.99,"2024-01-24","USA"],
          [1020,113,"Bookshelf","Furniture",1,89.99,"2024-01-24","UK"],
          [1021,101,"Wireless Charger","Electronics",2,24.99,"2024-01-25","USA"],
          [1022,114,"Coffee Mug Set","Home",1,19.99,"2024-01-25","Japan"],
          [1023,115,"Laptop Sleeve","Electronics",1,29.99,"2024-01-26","Australia"],
          [1024,103,"Stapler","Office",2,7.99,"2024-01-26","UK"],
          [1025,116,"Standing Desk","Furniture",1,399.99,"2024-01-27","USA"],
          [1026,117,"Bluetooth Speaker","Electronics",1,69.99,"2024-01-27","Germany"],
          [1027,118,"Wall Clock","Home",1,22.99,"2024-01-28","France"],
          [1028,102,"Screen Protector","Electronics",3,9.99,"2024-01-28","Canada"],
          [1029,119,"Desk Fan","Home",1,34.99,"2024-01-29","UK"],
          [1030,120,"Printer Paper","Office",5,12.99,"2024-01-29","USA"],
          [1031,108,"Monitor Arm","Furniture",1,79.99,"2024-01-30","France"],
          [1032,121,"Tablet Stand","Electronics",1,19.99,"2024-01-30","Japan"],
          [1033,101,"External SSD","Electronics",1,129.99,"2024-01-31","USA"],
          [1034,122,"Throw Pillow","Home",2,16.99,"2024-01-31","Canada"],
          [1035,123,"Paper Shredder","Office",1,89.99,"2024-02-01","Germany"],
          [1036,104,"LED Strip","Electronics",2,18.99,"2024-02-01","Germany"],
          [1037,124,"Yoga Mat","Home",1,29.99,"2024-02-02","Australia"],
          [1038,125,"USB Hub","Electronics",1,34.99,"2024-02-02","UK"],
          [1039,126,"Whiteboard","Office",1,49.99,"2024-02-03","USA"],
          [1040,127,"Foot Rest","Furniture",1,39.99,"2024-02-03","Canada"],
          [1041,102,"Phone Stand","Electronics",2,14.99,"2024-02-04","Canada"],
          [1042,128,"Scented Candle","Home",3,11.99,"2024-02-04","France"],
          [1043,129,"Label Maker","Office",1,59.99,"2024-02-05","USA"],
          [1044,130,"Gaming Mouse","Electronics",1,49.99,"2024-02-05","Japan"],
          [1045,101,"Webcam Cover","Electronics",5,4.99,"2024-02-06","USA"],
          [1046,131,"Picture Frame","Home",2,14.99,"2024-02-06","UK"],
          [1047,132,"Binder Set","Office",3,12.99,"2024-02-07","Germany"],
          [1048,133,"Ergonomic Mouse","Electronics",1,59.99,"2024-02-07","Australia"],
          [1049,134,"Coaster Set","Home",1,9.99,"2024-02-08","Canada"],
          [1050,135,"Calculator","Office",1,24.99,"2024-02-08","USA"]
        ]
      },
      customers: {
        columns: ["customer_id", "name", "email", "join_date", "membership", "total_orders"],
        data: [
          [101,"John Smith","john.smith@email.com","2023-01-15","Gold",8],
          [102,"Sarah Johnson","sarah.j@email.com","2023-03-22","Silver",5],
          [103,"Mike Brown","m.brown@email.com","2023-05-10","Bronze",3],
          [104,"Emma Wilson","emma.w@email.com","2023-06-18","Gold",3],
          [105,"Chris Davis","c.davis@email.com","2023-08-05","Silver",2],
          [106,"Lisa Anderson","l.anderson@email.com","2023-09-12","Bronze",1],
          [107,"Tom Martinez","t.martinez@email.com","2023-10-20","Silver",1],
          [108,"Amy Taylor","a.taylor@email.com","2023-11-08","Gold",2],
          [109,"David Lee","d.lee@email.com","2023-12-01","Bronze",1],
          [110,"Karen White","k.white@email.com","2024-01-05","Silver",1],
          [111,"James Clark","j.clark@email.com","2024-01-10","Bronze",1],
          [112,"Nina Patel","n.patel@email.com","2024-01-12","Gold",1],
          [113,"Robert Kim","r.kim@email.com","2024-01-14","Silver",1],
          [114,"Yuki Tanaka","y.tanaka@email.com","2024-01-20","Bronze",1],
          [115,"Sophie Miller","s.miller@email.com","2024-01-21","Silver",1],
          [116,"Mark Johnson","m.johnson@email.com","2024-01-22","Gold",1],
          [117,"Hans Mueller","h.mueller@email.com","2024-01-23","Bronze",1],
          [118,"Claire Dubois","c.dubois@email.com","2024-01-24","Silver",1],
          [119,"Oliver Wright","o.wright@email.com","2024-01-25","Bronze",1],
          [120,"Emily Chen","e.chen@email.com","2024-01-26","Silver",1]
        ]
      }
    },
    suggestedQueries: [
      "SELECT category, SUM(quantity * price) as revenue FROM orders GROUP BY category ORDER BY revenue DESC",
      "SELECT country, COUNT(*) as orders, ROUND(SUM(quantity * price),2) as total_spent FROM orders GROUP BY country ORDER BY total_spent DESC",
      "SELECT * FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.membership = 'Gold'",
      "SELECT product, SUM(quantity) as units_sold FROM orders GROUP BY product ORDER BY units_sold DESC LIMIT 10",
      "SELECT order_date, COUNT(*) as orders, ROUND(SUM(quantity * price),2) as daily_revenue FROM orders GROUP BY order_date ORDER BY order_date",
    ]
  },

  employees: {
    name: "Company HR Data",
    icon: Users,
    description: "50 employees across 5 departments with salary data",
    source: "Sample Data",
    tables: {
      employees: {
        columns: ["emp_id", "name", "department", "position", "salary", "hire_date", "manager_id", "performance_rating"],
        data: [
          [1,"Alice Chen","Engineering","VP Engineering",185000,"2016-03-15",null,4.8],
          [2,"Bob Martinez","Engineering","Senior Developer",125000,"2018-06-01",1,4.5],
          [3,"Carol White","Engineering","Developer",95000,"2019-01-10",2,4.2],
          [4,"David Kim","Engineering","Developer",92000,"2019-08-20",2,4.0],
          [5,"Eva Johnson","Engineering","Junior Developer",72000,"2021-04-15",2,3.8],
          [6,"Frank Brown","Engineering","Junior Developer",70000,"2022-01-10",2,3.5],
          [7,"Grace Lee","Engineering","Tech Lead",135000,"2017-09-01",1,4.7],
          [8,"Henry Wilson","Engineering","Senior Developer",120000,"2018-11-15",7,4.4],
          [9,"Ivy Taylor","Engineering","Developer",98000,"2020-03-22",7,4.1],
          [10,"Jack Davis","Engineering","Developer",94000,"2020-07-01",7,3.9],
          [11,"Kate Anderson","Marketing","VP Marketing",175000,"2016-05-10",null,4.6],
          [12,"Leo Garcia","Marketing","Marketing Manager",105000,"2018-09-01",11,4.3],
          [13,"Maria Lopez","Marketing","Senior Specialist",85000,"2019-11-15",12,4.1],
          [14,"Nathan Clark","Marketing","Specialist",68000,"2021-02-28",12,3.7],
          [15,"Olivia Moore","Marketing","Specialist",65000,"2021-08-10",12,3.6],
          [16,"Peter Wright","Marketing","Junior Specialist",52000,"2023-01-15",12,3.4],
          [17,"Quinn Harris","Sales","VP Sales",180000,"2015-08-20",null,4.9],
          [18,"Rachel Green","Sales","Sales Director",140000,"2017-02-28",17,4.6],
          [19,"Steve Rogers","Sales","Senior Sales Rep",95000,"2018-06-15",18,4.4],
          [20,"Tina Turner","Sales","Senior Sales Rep",92000,"2019-01-20",18,4.2],
          [21,"Uma Patel","Sales","Sales Rep",72000,"2020-05-10",18,3.9],
          [22,"Victor Stone","Sales","Sales Rep",70000,"2020-09-01",18,3.7],
          [23,"Wendy Wu","Sales","Sales Rep",68000,"2021-03-15",18,3.8],
          [24,"Xavier Jones","Sales","Junior Sales Rep",55000,"2022-07-01",18,3.5],
          [25,"Yara Silva","Sales","Junior Sales Rep",52000,"2023-02-15",18,3.3],
          [26,"Zach Miller","HR","HR Director",130000,"2017-04-10",null,4.5],
          [27,"Anna Schmidt","HR","HR Manager",95000,"2019-08-01",26,4.2],
          [28,"Brian Foster","HR","Recruiter",65000,"2020-11-15",27,3.9],
          [29,"Cindy Park","HR","Recruiter",62000,"2021-06-01",27,3.7],
          [30,"Derek Adams","HR","HR Specialist",58000,"2022-02-28",27,3.6],
          [31,"Elena Rossi","Finance","CFO",195000,"2015-01-15",null,4.9],
          [32,"Felix Chang","Finance","Finance Director",145000,"2017-06-01",31,4.6],
          [33,"Gina Torres","Finance","Senior Accountant",95000,"2018-10-15",32,4.3],
          [34,"Howard Stark","Finance","Accountant",78000,"2019-12-01",32,4.0],
          [35,"Isabel Santos","Finance","Accountant",75000,"2020-04-15",32,3.8],
          [36,"Jason Todd","Finance","Junior Accountant",58000,"2021-09-01",32,3.5],
          [37,"Kelly Blue","Finance","Financial Analyst",82000,"2020-01-10",32,4.1],
          [38,"Larry King","Finance","Financial Analyst",80000,"2020-06-15",32,3.9],
          [39,"Monica Geller","Operations","COO",190000,"2014-11-01",null,4.8],
          [40,"Nick Fury","Operations","Operations Manager",115000,"2018-03-15",39,4.4],
          [41,"Ophelia Hunt","Operations","Logistics Lead",85000,"2019-07-01",40,4.1],
          [42,"Paul Allen","Operations","Supply Chain Specialist",72000,"2020-10-15",40,3.8],
          [43,"Rosa Diaz","Operations","Operations Analyst",68000,"2021-04-01",40,3.7],
          [44,"Sam Wilson","Operations","Operations Analyst",65000,"2021-11-15",40,3.6],
          [45,"Tanya Reid","Operations","Coordinator",55000,"2022-05-01",40,3.4],
          [46,"Ulysses Grant","Engineering","Data Engineer",115000,"2019-05-10",1,4.3],
          [47,"Vera Wang","Engineering","Data Engineer",112000,"2019-09-15",1,4.2],
          [48,"Will Turner","Marketing","Content Manager",78000,"2020-02-01",12,4.0],
          [49,"Xena Prince","Sales","Account Manager",88000,"2019-04-15",18,4.3],
          [50,"Yolanda King","HR","Training Specialist",62000,"2021-08-01",27,3.8]
        ]
      },
      departments: {
        columns: ["dept_id", "dept_name", "budget", "location", "head_count"],
        data: [
          [1,"Engineering",2500000,"Building A - Floor 3",12],
          [2,"Marketing",800000,"Building B - Floor 1",6],
          [3,"Sales",1200000,"Building A - Floor 1",9],
          [4,"HR",400000,"Building C - Floor 2",5],
          [5,"Finance",600000,"Building C - Floor 1",8],
          [6,"Operations",900000,"Building A - Floor 2",7]
        ]
      },
      salaries: {
        columns: ["emp_id", "year", "base_salary", "bonus", "total_compensation"],
        data: [
          [1,2023,180000,25000,205000],[1,2024,185000,28000,213000],
          [2,2023,120000,15000,135000],[2,2024,125000,18000,143000],
          [3,2023,90000,8000,98000],[3,2024,95000,10000,105000],
          [7,2023,130000,18000,148000],[7,2024,135000,20000,155000],
          [11,2023,170000,22000,192000],[11,2024,175000,25000,200000],
          [17,2023,175000,30000,205000],[17,2024,180000,35000,215000],
          [26,2023,125000,15000,140000],[26,2024,130000,18000,148000],
          [31,2023,190000,35000,225000],[31,2024,195000,40000,235000],
          [39,2023,185000,32000,217000],[39,2024,190000,38000,228000]
        ]
      }
    },
    suggestedQueries: [
      "SELECT department, COUNT(*) as employees, ROUND(AVG(salary),0) as avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC",
      "SELECT * FROM employees WHERE salary > 100000 ORDER BY salary DESC",
      "SELECT department, ROUND(AVG(performance_rating),2) as avg_rating FROM employees GROUP BY department ORDER BY avg_rating DESC",
      "SELECT e.name, e.position, e.salary, m.name as manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id",
      "SELECT position, COUNT(*) as count, MIN(salary) as min_sal, MAX(salary) as max_sal FROM employees GROUP BY position ORDER BY count DESC",
    ]
  }
};

// ============ LEETCODE-STYLE CHALLENGES ============
const challenges = [
  // EASY
  {
    id: 1,
    title: "Surviving Passengers",
    difficulty: "Easy",
    category: "SELECT",
    xpReward: 20,
    description: "Write a SQL query to find all passengers who **survived** the Titanic disaster.",
    tables: ["passengers"],
    example: {
      input: "passengers table contains passenger data with a 'survived' column (1 = survived, 0 = died)",
      output: "All rows where survived = 1"
    },
    hint: "Use WHERE to filter rows where survived equals 1",
    solution: "SELECT * FROM passengers WHERE survived = 1",
    dataset: "titanic"
  },
  {
    id: 2,
    title: "Top 5 Highest Rated Movies",
    difficulty: "Easy",
    category: "ORDER BY",
    xpReward: 20,
    description: "Write a SQL query to find the **top 5 movies** with the highest rating. Return title and rating, sorted by rating descending.",
    tables: ["movies"],
    example: {
      input: "movies table with title and rating columns",
      output: "5 rows with highest ratings"
    },
    hint: "Use ORDER BY rating DESC and LIMIT 5",
    solution: "SELECT title, rating FROM movies ORDER BY rating DESC LIMIT 5",
    dataset: "movies"
  },
  {
    id: 3,
    title: "Female Passengers",
    difficulty: "Easy",
    category: "WHERE",
    xpReward: 20,
    description: "Write a SQL query to find all **female passengers**. Return their name and age.",
    tables: ["passengers"],
    example: {
      input: "passengers table with sex column ('male' or 'female')",
      output: "All female passengers with name and age"
    },
    hint: "Filter WHERE sex = 'female'",
    solution: "SELECT name, age FROM passengers WHERE sex = 'female'",
    dataset: "titanic"
  },
  {
    id: 4,
    title: "Expensive Products",
    difficulty: "Easy",
    category: "WHERE",
    xpReward: 25,
    description: "Write a SQL query to find all orders where the **price is greater than $50**. Return product, price, and country.",
    tables: ["orders"],
    example: {
      input: "orders table with price column",
      output: "Orders with price > 50"
    },
    hint: "Use WHERE price > 50",
    solution: "SELECT product, price, country FROM orders WHERE price > 50",
    dataset: "ecommerce"
  },
  {
    id: 5,
    title: "Unique Flower Species",
    difficulty: "Easy",
    category: "DISTINCT",
    xpReward: 25,
    description: "Write a SQL query to find all **unique species** in the flowers table.",
    tables: ["flowers"],
    example: {
      input: "flowers table with species column",
      output: "3 unique species names"
    },
    hint: "Use SELECT DISTINCT",
    solution: "SELECT DISTINCT species FROM flowers",
    dataset: "iris"
  },
  // MEDIUM
  {
    id: 6,
    title: "Survival Rate by Class",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 40,
    description: "Write a SQL query to find the **number of survivors per passenger class** (pclass). Return pclass and the count of survivors.",
    tables: ["passengers"],
    example: {
      input: "passengers table with pclass and survived columns",
      output: "3 rows showing survival count per class"
    },
    hint: "Use GROUP BY pclass and filter WHERE survived = 1",
    solution: "SELECT pclass, COUNT(*) as survivors FROM passengers WHERE survived = 1 GROUP BY pclass",
    dataset: "titanic"
  },
  {
    id: 7,
    title: "Average Movie Rating by Genre",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 40,
    description: "Write a SQL query to find the **average rating for each genre**. Return genre and average rating (as avg_rating), sorted by average rating descending.",
    tables: ["movies"],
    example: {
      input: "movies table with genre and rating columns",
      output: "Genres with their average ratings, highest first"
    },
    hint: "Use GROUP BY genre with AVG(rating), then ORDER BY",
    solution: "SELECT genre, AVG(rating) as avg_rating FROM movies GROUP BY genre ORDER BY avg_rating DESC",
    dataset: "movies"
  },
  {
    id: 8,
    title: "High Earning Departments",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 50,
    description: "Write a SQL query to find departments where the **average salary exceeds $80,000**. Return department and average salary.",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Departments with avg salary > 80000"
    },
    hint: "Use GROUP BY with HAVING AVG(salary) > 80000",
    solution: "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 80000",
    dataset: "employees"
  },
  {
    id: 9,
    title: "Revenue by Country",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 45,
    description: "Write a SQL query to calculate **total revenue by country**. Revenue = quantity × price. Return country and total_revenue, sorted by revenue descending.",
    tables: ["orders"],
    example: {
      input: "orders table with country, quantity, price",
      output: "Countries with their total revenue"
    },
    hint: "Use SUM(quantity * price) and GROUP BY country",
    solution: "SELECT country, SUM(quantity * price) as total_revenue FROM orders GROUP BY country ORDER BY total_revenue DESC",
    dataset: "ecommerce"
  },
  {
    id: 10,
    title: "Prolific Directors",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 50,
    description: "Write a SQL query to find directors who have directed **3 or more movies**. Return director and number of films, sorted by film count descending.",
    tables: ["movies"],
    example: {
      input: "movies table with director column",
      output: "Directors with 3+ movies"
    },
    hint: "GROUP BY director, HAVING COUNT(*) >= 3",
    solution: "SELECT director, COUNT(*) as films FROM movies GROUP BY director HAVING COUNT(*) >= 3 ORDER BY films DESC",
    dataset: "movies"
  },
  {
    id: 11,
    title: "Flower Measurements by Species",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 45,
    description: "Write a SQL query to find the **average petal_length and petal_width for each species**. Round to 2 decimal places.",
    tables: ["flowers"],
    example: {
      input: "flowers table with species, petal_length, petal_width",
      output: "3 rows with species and average measurements"
    },
    hint: "Use AVG() with ROUND() and GROUP BY species",
    solution: "SELECT species, ROUND(AVG(petal_length), 2) as avg_petal_length, ROUND(AVG(petal_width), 2) as avg_petal_width FROM flowers GROUP BY species",
    dataset: "iris"
  },
  // MEDIUM-HARD (Bridge challenges)
  {
    id: 12,
    title: "Customer Orders",
    difficulty: "Medium",
    category: "JOIN",
    xpReward: 55,
    description: "Write a SQL query to show each order with **customer details**. Return product, price, customer name, and membership level.",
    tables: ["orders", "customers"],
    example: {
      input: "orders and customers tables linked by customer_id",
      output: "Orders with customer name and membership"
    },
    hint: "JOIN orders with customers ON customer_id",
    solution: "SELECT o.product, o.price, c.name, c.membership FROM orders o JOIN customers c ON o.customer_id = c.customer_id",
    dataset: "ecommerce"
  },
  {
    id: 13,
    title: "Gold Member Spending",
    difficulty: "Medium",
    category: "JOIN + GROUP BY",
    xpReward: 60,
    description: "Write a SQL query to find the **total spending by Gold members**. Return customer name and their total spent (quantity × price).",
    tables: ["orders", "customers"],
    example: {
      input: "orders and customers tables",
      output: "Gold members with their total spending"
    },
    hint: "JOIN tables, filter membership = 'Gold', GROUP BY customer",
    solution: "SELECT c.name, SUM(o.quantity * o.price) as total_spent FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.membership = 'Gold' GROUP BY c.name",
    dataset: "ecommerce"
  },
  {
    id: 14,
    title: "Department Salary Range",
    difficulty: "Medium",
    category: "Aggregation",
    xpReward: 55,
    description: "Write a SQL query to find the **salary range for each department**. Return department, minimum salary, maximum salary, and the difference (as salary_range).",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Departments with min, max, and range"
    },
    hint: "Use MIN(), MAX() and subtraction in GROUP BY",
    solution: "SELECT department, MIN(salary) as min_salary, MAX(salary) as max_salary, MAX(salary) - MIN(salary) as salary_range FROM employees GROUP BY department",
    dataset: "employees"
  },
  {
    id: 15,
    title: "Blockbuster Genres",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 55,
    description: "Write a SQL query to find genres where **total box office revenue exceeds $1 billion**. Return genre, number of movies, and total revenue. Sort by revenue descending.",
    tables: ["movies"],
    example: {
      input: "movies table with genre and revenue_millions",
      output: "High-grossing genres (>$1B total)"
    },
    hint: "GROUP BY genre, HAVING SUM(revenue_millions) > 1000",
    solution: "SELECT genre, COUNT(*) as movie_count, SUM(revenue_millions) as total_revenue FROM movies GROUP BY genre HAVING SUM(revenue_millions) > 1000 ORDER BY total_revenue DESC",
    dataset: "movies"
  },
  // HARD
  {
    id: 16,
    title: "Second Highest Salary",
    difficulty: "Hard",
    category: "Subquery",
    xpReward: 80,
    description: "Write a SQL query to find the **second highest salary** from the employees table. If there is no second highest salary, return NULL.",
    tables: ["employees"],
    example: {
      input: "employees table with various salaries",
      output: "Single value: the second highest salary"
    },
    hint: "Use a subquery with MAX to exclude the highest salary, then find MAX of remaining",
    solution: "SELECT MAX(salary) as second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
    dataset: "employees"
  },
  {
    id: 17,
    title: "Employees Earning More Than Manager",
    difficulty: "Hard",
    category: "Self-Join",
    xpReward: 90,
    description: "Write a SQL query to find employees who earn **more than their manager**. Return employee name, employee salary, manager name, and manager salary.",
    tables: ["employees"],
    example: {
      input: "employees table with manager_id referencing emp_id",
      output: "Employees whose salary > their manager's salary"
    },
    hint: "Self-join employees table: JOIN employees m ON e.manager_id = m.emp_id, then compare salaries",
    solution: "SELECT e.name as employee, e.salary as emp_salary, m.name as manager, m.salary as mgr_salary FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary",
    dataset: "employees"
  },
  {
    id: 18,
    title: "Department with Highest Average Salary",
    difficulty: "Hard",
    category: "Subquery",
    xpReward: 85,
    description: "Write a SQL query to find the **department with the highest average salary**. Return only the department name and its average salary.",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Single row: department with highest avg salary"
    },
    hint: "Use GROUP BY to get averages, then use ORDER BY DESC LIMIT 1, or a subquery with MAX",
    solution: "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC LIMIT 1",
    dataset: "employees"
  },
  {
    id: 19,
    title: "Customers Who Never Ordered",
    difficulty: "Hard",
    category: "LEFT JOIN / NOT IN",
    xpReward: 85,
    description: "Write a SQL query to find all **customers who have never placed an order**. Return customer name only.",
    tables: ["customers", "orders"],
    example: {
      input: "customers and orders tables",
      output: "Customer names with no matching orders"
    },
    hint: "Use LEFT JOIN and check for NULL, or use NOT IN with a subquery",
    solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL",
    dataset: "ecommerce"
  },
  {
    id: 20,
    title: "Top Spender Per Country",
    difficulty: "Hard",
    category: "Subquery / Ranking",
    xpReward: 95,
    description: "Write a SQL query to find the **customer who spent the most in each country**. Return country, customer_id, and their total spending.",
    tables: ["orders", "customers"],
    example: {
      input: "orders with country and customer_id",
      output: "One row per country with top spender"
    },
    hint: "First calculate total per customer per country, then use a subquery to find the max per country",
    solution: "SELECT o.country, o.customer_id, SUM(o.quantity * o.price) as total_spent FROM orders o GROUP BY o.country, o.customer_id HAVING total_spent = (SELECT MAX(sub_total) FROM (SELECT country as c, customer_id, SUM(quantity * price) as sub_total FROM orders GROUP BY country, customer_id) sub WHERE sub.c = o.country)",
    dataset: "ecommerce"
  },
  {
    id: 21,
    title: "Survival Rate Analysis",
    difficulty: "Hard",
    category: "Complex Analysis",
    xpReward: 90,
    description: "Write a SQL query to find passenger classes where **survival rate exceeds 50%**. Return pclass, total passengers, survivors, and survival_rate (as percentage).",
    tables: ["passengers"],
    example: {
      input: "passengers table",
      output: "Classes with >50% survival rate"
    },
    hint: "Calculate COUNT(*) for total, SUM(survived) for survivors, then compute percentage and filter with HAVING",
    solution: "SELECT pclass, COUNT(*) as total, SUM(survived) as survivors, ROUND(100.0 * SUM(survived) / COUNT(*), 1) as survival_rate FROM passengers GROUP BY pclass HAVING survival_rate > 50",
    dataset: "titanic"
  },
  {
    id: 22,
    title: "Billion Dollar Directors",
    difficulty: "Hard", 
    category: "Multiple HAVING",
    xpReward: 90,
    description: "Write a SQL query to find directors whose **total box office revenue exceeds $2 billion** AND have directed **at least 2 movies** in the database. Return director, movie count, total revenue, and average rating.",
    tables: ["movies"],
    example: {
      input: "movies table",
      output: "Elite directors with massive box office"
    },
    hint: "GROUP BY director, use HAVING with multiple conditions: SUM(revenue) > 2000 AND COUNT(*) >= 2",
    solution: "SELECT director, COUNT(*) as movies, SUM(revenue_millions) as total_revenue, ROUND(AVG(rating), 2) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 2 AND SUM(revenue_millions) > 2000 ORDER BY total_revenue DESC",
    dataset: "movies"
  },
  {
    id: 23,
    title: "Salary Rank Within Department",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 100,
    description: "Write a SQL query to **rank employees by salary within each department**. Return name, department, salary, and rank (1 = highest paid in dept). Use dense ranking (no gaps).",
    tables: ["employees"],
    example: {
      input: "employees table",
      output: "All employees with their salary rank in their department"
    },
    hint: "Use window function: DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)",
    solution: "SELECT name, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank FROM employees",
    dataset: "employees"
  },
  {
    id: 24,
    title: "Running Total Revenue",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 100,
    description: "Write a SQL query to calculate the **running total of revenue by order date**. Return order_date, daily revenue, and cumulative revenue up to that date.",
    tables: ["orders"],
    example: {
      input: "orders table with dates and prices",
      output: "Daily revenue with running cumulative total"
    },
    hint: "First aggregate by date, then use SUM() OVER (ORDER BY order_date) for running total",
    solution: "SELECT order_date, SUM(quantity * price) as daily_revenue, SUM(SUM(quantity * price)) OVER (ORDER BY order_date) as cumulative_revenue FROM orders GROUP BY order_date ORDER BY order_date",
    dataset: "ecommerce"
  },
  {
    id: 25,
    title: "Movies Better Than Genre Average",
    difficulty: "Hard",
    category: "Correlated Subquery",
    xpReward: 100,
    description: "Write a SQL query to find movies that have a **rating higher than the average rating of their genre**. Return title, genre, rating, and genre average.",
    tables: ["movies"],
    example: {
      input: "movies table",
      output: "Movies that outperform their genre's average"
    },
    hint: "Use a correlated subquery to calculate genre average for each movie's genre, then compare",
    solution: "SELECT m.title, m.genre, m.rating, (SELECT ROUND(AVG(rating), 2) FROM movies m2 WHERE m2.genre = m.genre) as genre_avg FROM movies m WHERE m.rating > (SELECT AVG(rating) FROM movies m2 WHERE m2.genre = m.genre) ORDER BY m.genre, m.rating DESC",
    dataset: "movies"
  },
  {
    id: 26,
    title: "Revenue by Decade",
    difficulty: "Hard",
    category: "Expression Grouping",
    xpReward: 95,
    description: "Write a SQL query to compare **movie revenue by decade**. Return decade (e.g., 1990, 2000, 2010), number of movies, total revenue, and average revenue per film.",
    tables: ["movies"],
    example: {
      input: "movies table with year and revenue",
      output: "Revenue stats grouped by decade"
    },
    hint: "Use (year / 10) * 10 to calculate decade, then GROUP BY decade",
    solution: "SELECT (year / 10) * 10 as decade, COUNT(*) as movie_count, ROUND(SUM(revenue_millions), 0) as total_revenue, ROUND(AVG(revenue_millions), 1) as avg_revenue FROM movies GROUP BY decade ORDER BY decade",
    dataset: "movies"
  },
  {
    id: 27,
    title: "Over Budget Departments",
    difficulty: "Hard",
    category: "JOIN + Aggregation",
    xpReward: 90,
    description: "Write a SQL query to compare **each department's actual salary expense vs budget**. Return department name, budget, total salaries, and remaining budget. Only show departments that are over budget (negative remaining).",
    tables: ["employees", "departments"],
    example: {
      input: "employees and departments tables",
      output: "Departments where total salaries exceed budget"
    },
    hint: "JOIN on department name, GROUP BY to sum salaries, calculate budget - total_salaries, filter negative",
    solution: "SELECT d.dept_name, d.budget, SUM(e.salary) as total_salaries, d.budget - SUM(e.salary) as remaining FROM departments d JOIN employees e ON d.dept_name = e.department GROUP BY d.dept_name, d.budget HAVING remaining < 0",
    dataset: "employees"
  },
  {
    id: 28,
    title: "Highest Fare Per Port",
    difficulty: "Hard",
    category: "Correlated Subquery",
    xpReward: 85,
    description: "Write a SQL query to find the **passenger who paid the highest fare at each embarkation port**. Return embarked, passenger name, and fare.",
    tables: ["passengers"],
    example: {
      input: "passengers table with embarked (S, C, Q) and fare",
      output: "Top paying passenger per port"
    },
    hint: "Use a correlated subquery to find max fare per port, then match passengers",
    solution: "SELECT p.embarked, p.name, p.fare FROM passengers p WHERE p.fare = (SELECT MAX(fare) FROM passengers p2 WHERE p2.embarked = p.embarked) AND p.embarked IS NOT NULL ORDER BY p.fare DESC",
    dataset: "titanic"
  },
  {
    id: 29,
    title: "Nth Highest Salary per Department",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 110,
    description: "Write a SQL query to find the **top 3 earners in each department**. Return department, name, salary, and their rank within the department.",
    tables: ["employees"],
    example: {
      input: "employees table",
      output: "Top 3 paid employees per department"
    },
    hint: "Use DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) and filter rank <= 3",
    solution: "SELECT department, name, salary, dept_rank FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank FROM employees) ranked WHERE dept_rank <= 3",
    dataset: "employees"
  },
  {
    id: 30,
    title: "Year-over-Year Growth",
    difficulty: "Hard",
    category: "Window Function / LAG",
    xpReward: 110,
    description: "Write a SQL query to calculate **year-over-year movie count growth**. For each year, show the year, movie count, previous year's count, and the difference.",
    tables: ["movies"],
    example: {
      input: "movies table with year",
      output: "Each year with its movie count and change from previous year"
    },
    hint: "Use GROUP BY year, then LAG() OVER (ORDER BY year) to get previous year's count",
    solution: "SELECT year, movie_count, LAG(movie_count) OVER (ORDER BY year) as prev_year, movie_count - LAG(movie_count) OVER (ORDER BY year) as growth FROM (SELECT year, COUNT(*) as movie_count FROM movies GROUP BY year) yearly ORDER BY year",
    dataset: "movies"
  }
];

// ============ GAME CONFIG ============
const levels = [
  { name: 'Novice', minXP: 0 },
  { name: 'Apprentice', minXP: 100 },
  { name: 'Developer', minXP: 300 },
  { name: 'Engineer', minXP: 600 },
  { name: 'Architect', minXP: 1000 },
  { name: 'Master', minXP: 1500 },
  { name: 'SQL Wizard', minXP: 2500 },
];

const achievements = [
  { id: 'first_query', name: 'First Steps', desc: 'Run your first SQL query', icon: Star, xp: 10 },
  { id: 'streak_3', name: 'On Fire!', desc: '3 correct in a row', icon: Flame, xp: 25 },
  { id: 'streak_5', name: 'Unstoppable', desc: '5 correct in a row', icon: Zap, xp: 50 },
  { id: 'data_explorer', name: 'Data Explorer', desc: 'Try 3 different datasets', icon: Database, xp: 30 },
  { id: 'csv_master', name: 'CSV Master', desc: 'Upload your own dataset', icon: Upload, xp: 40 },
  { id: 'query_50', name: 'Query Machine', desc: 'Run 50 queries', icon: Code, xp: 50 },
  { id: 'analyst', name: 'Data Analyst', desc: 'Use GROUP BY with HAVING', icon: BarChart3, xp: 35 },
  { id: 'challenge_5', name: 'Challenger', desc: 'Solve 5 challenges', icon: Target, xp: 40 },
  { id: 'challenge_10', name: 'Problem Solver', desc: 'Solve 10 challenges', icon: Award, xp: 75 },
  { id: 'challenge_20', name: 'SQL Expert', desc: 'Solve 20 challenges', icon: Zap, xp: 100 },
  { id: 'challenge_all', name: 'Challenge Master', desc: 'Solve all 30 challenges', icon: Trophy, xp: 200 },
  { id: 'graduate', name: 'Graduate', desc: 'Complete all AI lessons', icon: Trophy, xp: 100 },
];

// ============ COMPONENTS ============
function XPBar({ current, max, level }) {
  const pct = Math.min(((current - level.minXP) / (max - level.minXP)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-purple-300">{level.name}</span>
        <span className="text-gray-400">{current} XP</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AchievementPopup({ achievement, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const Icon = achievement.icon;
  return (
    <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl shadow-2xl animate-bounce z-50 flex items-center gap-3">
      <Icon size={24} /><div><p className="text-xs opacity-80">Achievement Unlocked!</p><p className="font-bold">{achievement.name}</p></div>
    </div>
  );
}

function ResultsTable({ columns, rows, error }) {
  if (error) return <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">❌ {error}</div>;
  if (!rows?.length) return <p className="text-gray-400 italic">No results</p>;
  return (
    <div className="overflow-auto max-h-72">
      <table className="min-w-full text-sm border border-green-500/30">
        <thead className="bg-green-500/20 sticky top-0">
          <tr>{columns.map((c,i) => <th key={i} className="px-3 py-2 text-left font-medium text-green-300 border-b border-green-500/30">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0,100).map((row,i) => (
            <tr key={i} className="hover:bg-green-500/10">
              {row.map((cell,j) => <td key={j} className="px-3 py-2 border-b border-green-500/20 text-gray-300">{cell === null ? <span className="text-gray-500">NULL</span> : String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 && <p className="text-xs text-gray-500 mt-2">Showing 100 of {rows.length} rows</p>}
    </div>
  );
}

function SQLEditor({ value, onChange, onRun, disabled }) {
  return (
    <div className="relative">
      <textarea value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); }}}
        placeholder="Write SQL here... (Ctrl+Enter to run)" disabled={disabled}
        className="w-full h-32 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none resize-none" spellCheck={false} />
      <button onClick={onRun} disabled={disabled} className="absolute bottom-3 right-3 flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 shadow-lg">
        <Play size={14} /> Run
      </button>
    </div>
  );
}

// ============ MAIN APP ============
function SQLQuest() {
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  
  // Database state
  const [db, setDb] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [currentDataset, setCurrentDataset] = useState('titanic');
  const [customTables, setCustomTables] = useState({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ columns: [], rows: [], error: null });
  const [activeTab, setActiveTab] = useState('learn');
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [queryCount, setQueryCount] = useState(0);
  const [datasetsUsed, setDatasetsUsed] = useState(new Set(['titanic']));
  const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
  const [showAchievement, setShowAchievement] = useState(null);
  const [solvedChallenges, setSolvedChallenges] = useState(new Set());
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengeQuery, setChallengeQuery] = useState('');
  const [challengeResult, setChallengeResult] = useState({ columns: [], rows: [], error: null });
  const [challengeExpected, setChallengeExpected] = useState({ columns: [], rows: [] });
  const [challengeStatus, setChallengeStatus] = useState(null);
  const [showChallengeHint, setShowChallengeHint] = useState(false);
  const [challengeFilter, setChallengeFilter] = useState('all');
  const fileInputRef = useRef(null);
  
  // AI Learning state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentAiLesson, setCurrentAiLesson] = useState(0);
  const [aiLessonPhase, setAiLessonPhase] = useState('intro'); // 'intro', 'teaching', 'practice', 'feedback'
  const [aiQuestionCount, setAiQuestionCount] = useState(0);
  const [aiCorrectCount, setAiCorrectCount] = useState(0);
  const [aiExpectedQuery, setAiExpectedQuery] = useState('');
  const [aiExpectedResult, setAiExpectedResult] = useState({ columns: [], rows: [] });
  const [aiUserResult, setAiUserResult] = useState({ columns: [], rows: [], error: null });
  const [showAiComparison, setShowAiComparison] = useState(false);
  const [completedAiLessons, setCompletedAiLessons] = useState(new Set());
  const [showSqlSandbox, setShowSqlSandbox] = useState(true);
  const [sandboxQuery, setSandboxQuery] = useState('');
  const [sandboxResult, setSandboxResult] = useState({ columns: [], rows: [], error: null });
  const [comprehensionCount, setComprehensionCount] = useState(0);
  const [comprehensionCorrect, setComprehensionCorrect] = useState(0);
  const [lessonAttempts, setLessonAttempts] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [comprehensionConsecutive, setComprehensionConsecutive] = useState(0);
  const [expectedResultMessageId, setExpectedResultMessageId] = useState(-1);
  // Exercise state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseCorrect, setExerciseCorrect] = useState(0);
  const [exerciseAttempted, setExerciseAttempted] = useState(false);
  // Exercises Tab state
  const [selectedExerciseLesson, setSelectedExerciseLesson] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseResult, setExerciseResult] = useState({ columns: [], rows: [], error: null });
  const [exerciseExpectedResult, setExerciseExpectedResult] = useState({ columns: [], rows: [] });
  const [showExerciseResult, setShowExerciseResult] = useState(false);
  const [completedExercises, setCompletedExercises] = useState(new Set()); // format: "lessonId-exerciseIndex"

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('sqlquest_user');
    if (savedUser) {
      loadUserSession(savedUser);
    }
  }, []);

  // Save user progress whenever key stats change
  useEffect(() => {
    if (currentUser && dbReady) {
      const userData = {
        username: currentUser,
        xp,
        streak,
        lives,
        queryCount,
        solvedChallenges: [...solvedChallenges],
        unlockedAchievements: [...unlockedAchievements],
        datasetsUsed: [...datasetsUsed],
        queryHistory: queryHistory.slice(-50),
        // AI Tutor progress
        aiTutorProgress: {
          currentAiLesson,
          aiMessages,
          aiLessonPhase,
          aiQuestionCount,
          aiCorrectCount,
          aiExpectedQuery,
          completedAiLessons: [...completedAiLessons],
          comprehensionCount,
          comprehensionCorrect,
          lessonAttempts,
          consecutiveCorrect,
          comprehensionConsecutive,
          completedExercises: [...completedExercises]
        },
        lastActive: Date.now()
      };
      saveUserData(currentUser, userData);
      saveToLeaderboard(currentUser, xp, solvedChallenges.size);
    }
  }, [xp, solvedChallenges, unlockedAchievements, queryCount, aiMessages, aiLessonPhase, currentAiLesson, completedAiLessons, comprehensionCount, comprehensionCorrect, consecutiveCorrect, comprehensionConsecutive, completedExercises]);

  // Load leaderboard periodically
  useEffect(() => {
    if (currentUser) {
      loadLeaderboard().then(setLeaderboard);
      const interval = setInterval(() => {
        loadLeaderboard().then(setLeaderboard);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Restore AI expected result when db is ready and there's a saved query
  useEffect(() => {
    if (db && aiExpectedQuery && aiMessages.length > 0) {
      const lesson = aiLessons[currentAiLesson];
      // Load the appropriate dataset first
      if (lesson) {
        if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
        else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
        else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
        else loadDataset(db, 'ecommerce');
      }
      
      // Recalculate expected result
      try {
        const result = db.exec(aiExpectedQuery);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
        }
      } catch (err) {
        console.error('Error restoring expected result:', err);
      }
    }
  }, [db, aiExpectedQuery]);

  const loadUserSession = async (username) => {
    const userData = await loadUserData(username);
    if (userData) {
      setCurrentUser(username);
      setXP(userData.xp || 0);
      setStreak(userData.streak || 0);
      setLives(userData.lives || 3);
      setQueryCount(userData.queryCount || 0);
      setSolvedChallenges(new Set(userData.solvedChallenges || []));
      setUnlockedAchievements(new Set(userData.unlockedAchievements || []));
      setDatasetsUsed(new Set(userData.datasetsUsed || ['titanic']));
      setQueryHistory(userData.queryHistory || []);
      
      // Restore AI Tutor progress
      if (userData.aiTutorProgress) {
        setCurrentAiLesson(userData.aiTutorProgress.currentAiLesson || 0);
        setAiMessages(userData.aiTutorProgress.aiMessages || []);
        setAiLessonPhase(userData.aiTutorProgress.aiLessonPhase || 'intro');
        setAiQuestionCount(userData.aiTutorProgress.aiQuestionCount || 0);
        setAiCorrectCount(userData.aiTutorProgress.aiCorrectCount || 0);
        setAiExpectedQuery(userData.aiTutorProgress.aiExpectedQuery || '');
        setCompletedAiLessons(new Set(userData.aiTutorProgress.completedAiLessons || []));
        setComprehensionCount(userData.aiTutorProgress.comprehensionCount || 0);
        setComprehensionCorrect(userData.aiTutorProgress.comprehensionCorrect || 0);
        setLessonAttempts(userData.aiTutorProgress.lessonAttempts || 0);
        setConsecutiveCorrect(userData.aiTutorProgress.consecutiveCorrect || 0);
        setComprehensionConsecutive(userData.aiTutorProgress.comprehensionConsecutive || 0);
        setCompletedExercises(new Set(userData.aiTutorProgress.completedExercises || []));
      }
      
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    } else {
      setCurrentUser(username);
      setShowAuth(false);
      localStorage.setItem('sqlquest_user', username);
    }
  };

  const handleLogin = async () => {
    if (!authUsername.trim()) {
      setAuthError('Please enter a username');
      return;
    }
    if (authUsername.length < 3) {
      setAuthError('Username must be at least 3 characters');
      return;
    }
    
    const userData = await loadUserData(authUsername.trim().toLowerCase());
    if (authMode === 'login' && !userData) {
      setAuthError('User not found. Create a new account?');
      return;
    }
    if (authMode === 'register' && userData) {
      setAuthError('Username already taken. Try logging in.');
      return;
    }
    
    await loadUserSession(authUsername.trim().toLowerCase());
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuth(true);
    setXP(0);
    setStreak(0);
    setLives(3);
    setQueryCount(0);
    setSolvedChallenges(new Set());
    setUnlockedAchievements(new Set());
    setQueryHistory([]);
    // Reset AI Tutor state
    setAiMessages([]);
    setCurrentAiLesson(0);
    setAiLessonPhase('intro');
    setAiQuestionCount(0);
    setAiCorrectCount(0);
    setAiExpectedQuery('');
    setAiExpectedResult({ columns: [], rows: [] });
    setExpectedResultMessageId(-1);
    setCompletedAiLessons(new Set());
    setComprehensionCount(0);
    setComprehensionCorrect(0);
    setLessonAttempts(0);
    setConsecutiveCorrect(0);
    setComprehensionConsecutive(0);
    setCompletedExercises(new Set());
    localStorage.removeItem('sqlquest_user');
  };

  const addToHistory = (sql, success, context) => {
    const entry = { sql, success, context, timestamp: Date.now() };
    setQueryHistory(prev => [...prev.slice(-49), entry]);
  };

  // AI Learning Lessons
  const aiLessons = [
    {
      id: 1,
      title: "Introduction to SQL",
      topic: "What is SQL and why it matters",
      concepts: ["databases", "tables", "rows", "columns", "queries"],
      practiceTable: "passengers",
      exercises: [
        // Easy
        { question: "Show all columns from the passengers table (limit to 5 rows)", sql: "SELECT * FROM passengers LIMIT 5", difficulty: "easy" },
        // Medium
        { question: "Display just the name and age columns from passengers (limit 10)", sql: "SELECT name, age FROM passengers LIMIT 10", difficulty: "medium" },
        { question: "Show passenger names, their class, and fare paid (limit 8)", sql: "SELECT name, pclass, fare FROM passengers LIMIT 8", difficulty: "medium" },
        // Hard
        { question: "Display name, age, sex, and survival status for 10 passengers", sql: "SELECT name, age, sex, survived FROM passengers LIMIT 10", difficulty: "hard" },
        { question: "Show all passenger details including passenger_id, name, pclass, sex, age, and fare (limit 5)", sql: "SELECT passenger_id, name, pclass, sex, age, fare FROM passengers LIMIT 5", difficulty: "hard" }
      ]
    },
    {
      id: 2,
      title: "SELECT Statement",
      topic: "Retrieving data from tables",
      concepts: ["SELECT", "FROM", "* (all columns)", "specific columns", "LIMIT"],
      practiceTable: "passengers",
      exercises: [
        // Easy
        { question: "Select the name column from passengers (limit 5)", sql: "SELECT name FROM passengers LIMIT 5", difficulty: "easy" },
        // Medium
        { question: "Show passenger names and their ages (limit 10)", sql: "SELECT name, age FROM passengers LIMIT 10", difficulty: "medium" },
        { question: "Display name, sex, and pclass for 7 passengers", sql: "SELECT name, sex, pclass FROM passengers LIMIT 7", difficulty: "medium" },
        // Hard (uses Lesson 1: multiple columns, specific selection)
        { question: "Select passenger_id, name, survived, pclass, and fare columns (limit 6)", sql: "SELECT passenger_id, name, survived, pclass, fare FROM passengers LIMIT 6", difficulty: "hard" },
        { question: "Show name, age, sex, fare, and embarked location for 5 passengers", sql: "SELECT name, age, sex, fare, embarked FROM passengers LIMIT 5", difficulty: "hard" }
      ]
    },
    {
      id: 3,
      title: "Filtering with WHERE",
      topic: "Filtering rows based on conditions",
      concepts: ["WHERE", "comparison operators (=, >, <, >=, <=, <>)", "text matching"],
      practiceTable: "passengers",
      exercises: [
        // Easy
        { question: "Find all passengers who survived (survived = 1)", sql: "SELECT * FROM passengers WHERE survived = 1", difficulty: "easy" },
        // Medium
        { question: "Show all female passengers", sql: "SELECT * FROM passengers WHERE sex = 'female'", difficulty: "medium" },
        { question: "Find passengers in first class (pclass = 1)", sql: "SELECT * FROM passengers WHERE pclass = 1", difficulty: "medium" },
        // Hard (uses Lessons 1-2: SELECT specific columns + WHERE)
        { question: "Show only name, age, and fare for passengers older than 50", sql: "SELECT name, age, fare FROM passengers WHERE age > 50", difficulty: "hard" },
        { question: "Display name, pclass, and survived for passengers who paid more than 100 fare", sql: "SELECT name, pclass, survived FROM passengers WHERE fare > 100", difficulty: "hard" }
      ]
    },
    {
      id: 4,
      title: "Combining Conditions",
      topic: "Using AND, OR to combine filters",
      concepts: ["AND", "OR", "operator precedence", "parentheses"],
      practiceTable: "passengers",
      exercises: [
        // Easy
        { question: "Find female passengers who survived", sql: "SELECT * FROM passengers WHERE sex = 'female' AND survived = 1", difficulty: "easy" },
        // Medium
        { question: "Show passengers in first OR second class", sql: "SELECT * FROM passengers WHERE pclass = 1 OR pclass = 2", difficulty: "medium" },
        { question: "Find first class passengers older than 40", sql: "SELECT * FROM passengers WHERE pclass = 1 AND age > 40", difficulty: "medium" },
        // Hard (uses Lessons 1-3: SELECT columns + WHERE + AND/OR)
        { question: "Show name, age, and fare for male survivors from third class", sql: "SELECT name, age, fare FROM passengers WHERE sex = 'male' AND survived = 1 AND pclass = 3", difficulty: "hard" },
        { question: "Display name, sex, pclass, and fare for female first-class passengers who paid over 50", sql: "SELECT name, sex, pclass, fare FROM passengers WHERE sex = 'female' AND pclass = 1 AND fare > 50", difficulty: "hard" }
      ]
    },
    {
      id: 5,
      title: "Sorting Results",
      topic: "Ordering query results",
      concepts: ["ORDER BY", "ASC", "DESC", "multiple sort columns"],
      practiceTable: "movies",
      exercises: [
        // Easy
        { question: "Show all movies sorted by rating (highest first)", sql: "SELECT * FROM movies ORDER BY rating DESC", difficulty: "easy" },
        // Medium
        { question: "List movies by year from oldest to newest", sql: "SELECT * FROM movies ORDER BY year ASC", difficulty: "medium" },
        { question: "Show top 5 highest revenue movies", sql: "SELECT * FROM movies ORDER BY revenue_millions DESC LIMIT 5", difficulty: "medium" },
        // Hard (uses Lessons 1-4: SELECT + WHERE + AND + ORDER BY)
        { question: "Show title, rating, and revenue for movies with rating > 8, sorted by revenue (highest first)", sql: "SELECT title, rating, revenue_millions FROM movies WHERE rating > 8 ORDER BY revenue_millions DESC", difficulty: "hard" },
        { question: "Display title, year, rating for Action OR Comedy movies, sorted by rating DESC then year DESC (limit 10)", sql: "SELECT title, year, rating FROM movies WHERE genre = 'Action' OR genre = 'Comedy' ORDER BY rating DESC, year DESC LIMIT 10", difficulty: "hard" }
      ]
    },
    {
      id: 6,
      title: "Aggregate Functions",
      topic: "Summarizing data with functions",
      concepts: ["COUNT", "SUM", "AVG", "MIN", "MAX"],
      practiceTable: "movies",
      exercises: [
        // Easy
        { question: "Count the total number of movies", sql: "SELECT COUNT(*) FROM movies", difficulty: "easy" },
        // Medium
        { question: "Find the average movie rating", sql: "SELECT AVG(rating) FROM movies", difficulty: "medium" },
        { question: "Find the highest revenue among all movies", sql: "SELECT MAX(revenue_millions) FROM movies", difficulty: "medium" },
        // Hard (uses Lessons 1-5: Aggregates + WHERE filtering)
        { question: "Count how many movies have rating above 8 AND revenue over 100 million", sql: "SELECT COUNT(*) FROM movies WHERE rating > 8 AND revenue_millions > 100", difficulty: "hard" },
        { question: "Find the average rating, total revenue, and count of Action movies", sql: "SELECT AVG(rating), SUM(revenue_millions), COUNT(*) FROM movies WHERE genre = 'Action'", difficulty: "hard" }
      ]
    },
    {
      id: 7,
      title: "GROUP BY",
      topic: "Grouping data for aggregation",
      concepts: ["GROUP BY", "aggregates with groups", "column selection rules"],
      practiceTable: "employees",
      exercises: [
        // Easy
        { question: "Count employees in each department", sql: "SELECT department, COUNT(*) FROM employees GROUP BY department", difficulty: "easy" },
        // Medium
        { question: "Find the average salary by department", sql: "SELECT department, AVG(salary) FROM employees GROUP BY department", difficulty: "medium" },
        { question: "Count employees by position", sql: "SELECT position, COUNT(*) FROM employees GROUP BY position", difficulty: "medium" },
        // Hard (uses Lessons 1-6: GROUP BY + WHERE + multiple aggregates + ORDER BY)
        { question: "Show department, count, and average salary for departments, sorted by average salary DESC", sql: "SELECT department, COUNT(*), AVG(salary) FROM employees GROUP BY department ORDER BY AVG(salary) DESC", difficulty: "hard" },
        { question: "Count employees and sum salaries by department, only for employees with salary > 60000, sorted by count DESC", sql: "SELECT department, COUNT(*), SUM(salary) FROM employees WHERE salary > 60000 GROUP BY department ORDER BY COUNT(*) DESC", difficulty: "hard" }
      ]
    },
    {
      id: 8,
      title: "HAVING Clause",
      topic: "Filtering grouped results",
      concepts: ["HAVING vs WHERE", "filtering after aggregation"],
      practiceTable: "employees",
      exercises: [
        // Easy
        { question: "Show departments with more than 5 employees", sql: "SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5", difficulty: "easy" },
        // Medium
        { question: "Find departments where average salary is above 70000", sql: "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 70000", difficulty: "medium" },
        { question: "Show positions held by at least 3 people", sql: "SELECT position, COUNT(*) FROM employees GROUP BY position HAVING COUNT(*) >= 3", difficulty: "medium" },
        // Hard (uses Lessons 1-7: WHERE + GROUP BY + HAVING + multiple aggregates + ORDER BY)
        { question: "Show departments with avg salary > 65000 AND more than 3 employees, sorted by avg salary DESC", sql: "SELECT department, AVG(salary), COUNT(*) FROM employees GROUP BY department HAVING AVG(salary) > 65000 AND COUNT(*) > 3 ORDER BY AVG(salary) DESC", difficulty: "hard" },
        { question: "For employees with salary > 50000, show departments having total salary > 200000, with count and sum, sorted by sum DESC", sql: "SELECT department, COUNT(*), SUM(salary) FROM employees WHERE salary > 50000 GROUP BY department HAVING SUM(salary) > 200000 ORDER BY SUM(salary) DESC", difficulty: "hard" }
      ]
    },
    {
      id: 9,
      title: "JOIN Basics",
      topic: "Combining data from multiple tables",
      concepts: ["INNER JOIN", "LEFT JOIN", "ON clause", "table aliases", "joining conditions"],
      practiceTable: "orders",
      joinTables: ["orders (order_id, customer_id, product, category, quantity, price, order_date, country)", "customers (customer_id, name, email, join_date, membership, total_orders)"],
      exercises: [
        // Easy
        { question: "Join orders with customers to show product and customer name (use INNER JOIN)", sql: "SELECT orders.product, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id", difficulty: "easy" },
        // Medium
        { question: "Show product, price, and customer email for all orders (use INNER JOIN)", sql: "SELECT orders.product, orders.price, customers.email FROM orders JOIN customers ON orders.customer_id = customers.customer_id", difficulty: "medium" },
        { question: "List ALL customers with their order products using LEFT JOIN (show customers even without orders)", sql: "SELECT customers.name, customers.membership, orders.product FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id", difficulty: "medium" },
        // Hard (uses Lessons 1-8: LEFT JOIN + WHERE + GROUP BY + ORDER BY)
        { question: "Using LEFT JOIN, show ALL customers with order count and total spent, sorted by total DESC", sql: "SELECT customers.name, COUNT(orders.order_id), SUM(orders.price) FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id GROUP BY customers.name ORDER BY SUM(orders.price) DESC", difficulty: "hard" },
        { question: "LEFT JOIN: Show Gold/Platinum members with name, membership, order count, avg price (include those with no orders)", sql: "SELECT customers.name, customers.membership, COUNT(orders.order_id), AVG(orders.price) FROM customers LEFT JOIN orders ON customers.customer_id = orders.customer_id WHERE customers.membership = 'Gold' OR customers.membership = 'Platinum' GROUP BY customers.name, customers.membership", difficulty: "hard" }
      ]
    },
    {
      id: 10,
      title: "Advanced Queries",
      topic: "Subqueries and complex analysis",
      concepts: ["subqueries", "nested SELECT", "correlated subqueries"],
      practiceTable: "movies",
      exercises: [
        // Easy
        { question: "Find movies with rating higher than average rating", sql: "SELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies)", difficulty: "easy" },
        // Medium
        { question: "Find the movie with the highest rating", sql: "SELECT * FROM movies WHERE rating = (SELECT MAX(rating) FROM movies)", difficulty: "medium" },
        { question: "Show movies with revenue above average revenue", sql: "SELECT * FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies)", difficulty: "medium" },
        // Hard (uses ALL previous lessons: Subqueries + SELECT columns + WHERE + AND + ORDER BY + aggregates)
        { question: "Show title, genre, rating, revenue for movies with above-average rating AND above-average votes, sorted by rating DESC (limit 10)", sql: "SELECT title, genre, rating, revenue_millions FROM movies WHERE rating > (SELECT AVG(rating) FROM movies) AND votes > (SELECT AVG(votes) FROM movies) ORDER BY rating DESC LIMIT 10", difficulty: "hard" },
        { question: "Find genre, count, and avg rating for genres that have movies with above-average revenue, having count > 3, sorted by avg rating DESC", sql: "SELECT genre, COUNT(*), AVG(rating) FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies) GROUP BY genre HAVING COUNT(*) > 3 ORDER BY AVG(rating) DESC", difficulty: "hard" }
      ]
    }
  ];

  const callAI = async (messages, systemPrompt) => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages
        })
      });
      const data = await response.json();
      return data.content?.[0]?.text || "I encountered an error. Please try again.";
    } catch (err) {
      console.error("AI API error:", err);
      return "Sorry, I couldn't connect to the AI. Please try again.";
    }
  };

  const getAISystemPrompt = (lesson, phase) => {
    const tableInfo = lesson.practiceTable === 'passengers' 
      ? `Table: passengers (passenger_id, survived, pclass, name, sex, age, sibsp, parch, fare, embarked) - Titanic passenger data. survived: 0=died, 1=survived. pclass: 1=first, 2=second, 3=third class.`
      : lesson.practiceTable === 'movies'
      ? `Table: movies (id, title, year, genre, rating, votes, revenue_millions, runtime, director) - Top 100 movies with ratings and box office.`
      : lesson.practiceTable === 'employees'
      ? `Table: employees (emp_id, name, department, position, salary, hire_date, manager_id, performance_rating) - 50 company employees.`
      : `Table: orders (order_id, customer_id, product, category, quantity, price, order_date, country) and customers (customer_id, name, email, join_date, membership, total_orders)`;

    return `You are an expert SQL tutor teaching a beginner.

Lesson: "${lesson.title}" - ${lesson.topic}
Concepts: ${lesson.concepts.join(", ")}
${tableInfo}

RULES: No markdown (**). Use CAPS for emphasis. Keep under 80 words. Use "QUESTION:" prefix.

Phase: ${phase}
${phase === 'intro' ? 'Introduce topic briefly. Ask if ready.' : ''}
${phase === 'teaching' ? 'Teach with ONE example. Ask if ready to practice.' : ''}
${phase === 'practice' ? `
MANDATORY: Your response MUST contain this EXACT tag with a valid SQL query:
[EXPECTED_SQL]SELECT ... FROM passengers ...[/EXPECTED_SQL]

The query inside MUST be the CORRECT ANSWER to the question you ask.
Example for "count passengers by class":
[EXPECTED_SQL]SELECT pclass, COUNT(*) FROM passengers GROUP BY pclass[/EXPECTED_SQL]

DO NOT forget the [EXPECTED_SQL] tag. Ask a DIFFERENT question each time.
` : ''}
${phase === 'feedback' ? 'Say "Correct!" or "Not quite" first. Brief explanation. NO [EXPECTED_SQL] in feedback.' : ''}
${phase === 'comprehension' ? `Conceptual question about: ${lesson.concepts.join(", ")}. Explain in own words, no code.` : ''}
${phase === 'comprehension_feedback' ? 'Say "Correct!" or "Not quite". Brief if wrong.' : ''}`;
  };

  const startAiLesson = async (lessonIndex, isRestart = false) => {
    const lesson = aiLessons[lessonIndex];
    setCurrentAiLesson(lessonIndex);
    setAiLessonPhase('intro');
    setAiMessages([]);
    setAiQuestionCount(0);
    setAiCorrectCount(0);
    setConsecutiveCorrect(0);
    setAiExpectedQuery('');
    setAiExpectedResult({ columns: [], rows: [] });
    setExpectedResultMessageId(-1);
    setAiUserResult({ columns: [], rows: [], error: null });
    setShowAiComparison(false);
    setSandboxQuery('');
    setSandboxResult({ columns: [], rows: [], error: null });
    setComprehensionCount(0);
    setComprehensionCorrect(0);
    setComprehensionConsecutive(0);
    // Reset exercise state
    setExerciseIndex(0);
    setExerciseCorrect(0);
    setExerciseAttempted(false);
    if (isRestart) {
      setLessonAttempts(prev => prev + 1);
    } else {
      setLessonAttempts(0);
    }
    setQuery('');
    setResults({ columns: [], rows: [], error: null });
    setAiLoading(true);

    // Load the appropriate dataset
    if (db) {
      if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
      else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
      else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
      else loadDataset(db, 'ecommerce');
    }

    const introMessage = isRestart 
      ? "I need to restart this lesson to help reinforce the concepts. Let's go through it again - I'll explain things differently this time!"
      : "Start the lesson please!";

    const response = await callAI(
      [{ role: "user", content: introMessage }],
      getAISystemPrompt(lesson, 'intro')
    );

    setAiMessages([{ role: "assistant", content: response }]);
    setAiLoading(false);
  };

  // Helper to send a quick message directly (for buttons)
  const sendQuickMessage = async (message, targetPhase) => {
    if (aiLoading) return;
    
    // IMMEDIATELY clear expected result when getting a new practice question
    if (targetPhase === 'practice') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
      setAiUserResult({ columns: [], rows: [], error: null });
      setResults({ columns: [], rows: [], error: null }); // Clear results display too
      setQuery('');
      setShowAiComparison(false);
    }
    
    setAiMessages(prev => [...prev, { role: "user", content: message }]);
    setAiLoading(true);
    setAiInput('');

    const lesson = aiLessons[currentAiLesson];
    
    // Reset streak when starting a new section
    if (targetPhase === 'practice' && aiLessonPhase === 'teaching') {
      setConsecutiveCorrect(0);
    } else if (targetPhase === 'comprehension' && aiLessonPhase === 'feedback') {
      setComprehensionConsecutive(0);
    }
    
    setAiLessonPhase(targetPhase);

    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const response = await callAI(
      conversationHistory,
      getAISystemPrompt(lesson, targetPhase)
    );

    // Check for expected SQL and update expected result
    const sqlMatch = response.match(/\[EXPECTED_SQL\]([\s\S]*?)\[\/EXPECTED_SQL\]/);
    if (sqlMatch && sqlMatch[1] && db) {
      const expectedSql = sqlMatch[1].trim();
      setAiExpectedQuery(expectedSql);
      try {
        const result = db.exec(expectedSql);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
          setExpectedResultMessageId(aiMessages.length + 1); // +1 for the message we're about to add
        }
      } catch (err) {
        console.error('Error running expected SQL:', err);
        setExpectedResultMessageId(-1);
      }
    } else {
      // No expected SQL found - clear to prevent stale data
      setExpectedResultMessageId(-1);
    }

    const cleanResponse = response.replace(/\[EXPECTED_SQL\][\s\S]*?\[\/EXPECTED_SQL\]/g, '').trim();
    setAiMessages(prev => [...prev, { role: "assistant", content: cleanResponse }]);
    setAiLoading(false);
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    
    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setAiLoading(true);
    setShowAiComparison(false);

    const lesson = aiLessons[currentAiLesson];
    let newPhase = aiLessonPhase;

    // Determine phase transitions based on user input
    const lowerInput = userMessage.toLowerCase();
    if (aiLessonPhase === 'intro' && (lowerInput.includes('yes') || lowerInput.includes('ready') || lowerInput.includes('start') || lowerInput.includes('let\'s go'))) {
      newPhase = 'teaching';
    } else if (aiLessonPhase === 'teaching' && (lowerInput.includes('practice') || lowerInput.includes('ready') || lowerInput.includes('try') || lowerInput.includes('question'))) {
      newPhase = 'practice';
      setConsecutiveCorrect(0);
    } else if (aiLessonPhase === 'practice') {
      newPhase = 'feedback';
      setAiQuestionCount(prev => prev + 1);
    } else if (aiLessonPhase === 'feedback') {
      // Moving to get another question - clear old expected result
      if (consecutiveCorrect >= 3) {
        newPhase = 'comprehension';
        setComprehensionConsecutive(0);
        setAiExpectedResult({ columns: [], rows: [] });
        setAiExpectedQuery('');
      } else {
        newPhase = 'practice';
      }
    } else if (aiLessonPhase === 'comprehension') {
      // User submitted a comprehension answer
      newPhase = 'comprehension_feedback';
      setComprehensionCount(prev => prev + 1);
    } else if (aiLessonPhase === 'comprehension_feedback') {
      // Check if we have 3 consecutive correct comprehension answers
      if (comprehensionConsecutive >= 3) {
        // Stay at comprehension_feedback - user clicks "Complete Lesson" button
        newPhase = 'comprehension_feedback';
      } else {
        newPhase = 'comprehension';
      }
    }

    setAiLessonPhase(newPhase);

    // Clear old expected result when transitioning to practice phase
    if (newPhase === 'practice') {
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
      setAiUserResult({ columns: [], rows: [], error: null });
      setResults({ columns: [], rows: [], error: null }); // Clear results display
      setQuery('');
      setShowAiComparison(false);
    }

    // Build conversation history for context
    const conversationHistory = [
      ...aiMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage }
    ];

    const response = await callAI(
      conversationHistory,
      getAISystemPrompt(lesson, newPhase)
    );

    // Check for expected SQL in response and update expected result
    const sqlMatch = response.match(/\[EXPECTED_SQL\]([\s\S]*?)\[\/EXPECTED_SQL\]/);
    if (sqlMatch && sqlMatch[1] && db) {
      const expectedSql = sqlMatch[1].trim();
      setAiExpectedQuery(expectedSql);
      try {
        const result = db.exec(expectedSql);
        if (result.length > 0) {
          setAiExpectedResult({ columns: result[0].columns, rows: result[0].values });
          setExpectedResultMessageId(aiMessages.length + 1); // +1 for user msg, +1 for assistant msg we're about to add
        } else {
          setAiExpectedResult({ columns: [], rows: [] });
          setExpectedResultMessageId(-1);
        }
      } catch (err) {
        console.error('Error running expected SQL:', err);
        setAiExpectedResult({ columns: [], rows: [] });
        setExpectedResultMessageId(-1);
      }
      // Clear user result when new question is asked
      setAiUserResult({ columns: [], rows: [], error: null });
      setShowAiComparison(false);
      setQuery('');
    } else if (newPhase === 'comprehension') {
      // Clear expected result when moving to comprehension phase
      setAiExpectedResult({ columns: [], rows: [] });
      setAiExpectedQuery('');
      setExpectedResultMessageId(-1);
    } else {
      // No expected SQL found for practice question - clear to prevent stale data
      setExpectedResultMessageId(-1);
    }

    // Check if AI indicates correct answer for practice - track consecutive
    if (aiLessonPhase === 'practice') {
      const respLower = response.toLowerCase();
      if (respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect') || respLower.includes('that\'s right')) {
        setAiCorrectCount(prev => prev + 1);
        setConsecutiveCorrect(prev => prev + 1);
      } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('try again') || respLower.includes('not correct')) {
        setConsecutiveCorrect(0); // Reset on wrong answer
      }
    }

    // Check if comprehension answer is correct - track consecutive
    if (aiLessonPhase === 'comprehension') {
      const respLower = response.toLowerCase();
      if (respLower.includes("that's right") || respLower.includes("correct") || respLower.includes("well explained") || respLower.includes("exactly") || respLower.includes("good explanation")) {
        setComprehensionCorrect(prev => prev + 1);
        setComprehensionConsecutive(prev => prev + 1);
      } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('not correct')) {
        setComprehensionConsecutive(0); // Reset on wrong answer
      }
    }

    // Clean the response to hide the expected SQL tag from display
    const cleanResponse = response.replace(/\[EXPECTED_SQL\][\s\S]*?\[\/EXPECTED_SQL\]/g, '').trim();

    setAiMessages(prev => [...prev, { role: "assistant", content: cleanResponse }]);
    setAiLoading(false);
  };

  const runAiQuery = () => {
    if (!query.trim() || !db) return;
    
    try {
      const result = db.exec(query);
      const userResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setAiUserResult(userResult);
      setResults(userResult);
      setShowAiComparison(true);
      addToHistory(query, true, 'ai-learning');
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      addToHistory(query, false, 'ai-learning');
    }
  };

  const runSandboxQuery = () => {
    if (!sandboxQuery.trim() || !db) return;
    
    try {
      const result = db.exec(sandboxQuery);
      const queryResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setSandboxResult(queryResult);
      addToHistory(sandboxQuery, true, 'ai-sandbox');
    } catch (err) {
      setSandboxResult({ columns: [], rows: [], error: err.message });
      addToHistory(sandboxQuery, false, 'ai-sandbox');
    }
  };

  const copySandboxToAnswer = () => {
    setQuery(sandboxQuery);
  };

  const submitAiQuery = async () => {
    if (!query.trim() || !db) return;
    
    try {
      const result = db.exec(query);
      const userResult = result.length > 0 
        ? { columns: result[0].columns, rows: result[0].values, error: null }
        : { columns: [], rows: [], error: null };
      
      setAiUserResult(userResult);
      setResults(userResult);
      setShowAiComparison(true);
      
      // Only compare if we have expected results
      const hasExpected = aiExpectedResult.rows.length > 0;
      const isCorrect = hasExpected && 
        JSON.stringify(userResult.rows) === JSON.stringify(aiExpectedResult.rows);
      
      const output = result.length > 0 
        ? `Query executed successfully! Returned ${result[0].values.length} rows.\nColumns: ${result[0].columns.join(', ')}\nFirst few rows:\n${result[0].values.slice(0, 3).map(r => r.join(', ')).join('\n')}`
        : 'Query executed but returned no results.';
      
      // Don't bias AI negatively if we don't have expected results
      let evalMessage = `I wrote this SQL query:\n\`\`\`sql\n${query}\n\`\`\`\n\nResult: ${output}`;
      if (hasExpected && isCorrect) {
        evalMessage += `\n\nThe results MATCH the expected output - this is CORRECT!`;
      } else if (hasExpected) {
        evalMessage += `\n\nThe results do NOT match expected output.`;
      } else {
        evalMessage += `\n\nPlease evaluate if this query correctly answers the question.`;
      }
      
      setAiInput('');
      setAiMessages(prev => [...prev, { role: "user", content: evalMessage }]);
      setAiLoading(true);
      setAiLessonPhase('feedback');
      setAiQuestionCount(prev => prev + 1);

      const lesson = aiLessons[currentAiLesson];
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: evalMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback')
      );

      // Track consecutive correct
      const respLower = response.toLowerCase();
      if (isCorrect || respLower.includes('correct') || respLower.includes('great job') || respLower.includes('well done') || respLower.includes('perfect') || respLower.includes("that's right")) {
        setAiCorrectCount(prev => prev + 1);
        setConsecutiveCorrect(prev => prev + 1);
      } else if (respLower.includes('not quite') || respLower.includes('incorrect') || respLower.includes('not correct')) {
        setConsecutiveCorrect(0);
      }

      setAiMessages(prev => [...prev, { role: "assistant", content: response }]);
      setAiLoading(false);
      addToHistory(query, true, 'ai-learning');
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      setConsecutiveCorrect(0); // Reset streak on error
      
      // Send error to AI
      const errorMessage = `I tried this query but got an error:\n\`\`\`sql\n${query}\n\`\`\`\nError: ${err.message}`;
      setAiMessages(prev => [...prev, { role: "user", content: errorMessage }]);
      setAiLoading(true);

      const lesson = aiLessons[currentAiLesson];
      const conversationHistory = [
        ...aiMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: errorMessage }
      ];

      const response = await callAI(
        conversationHistory,
        getAISystemPrompt(lesson, 'feedback') + "\nThe student's query had an error. Help them understand what went wrong."
      );

      setAiMessages(prev => [...prev, { role: "assistant", content: response }]);
      setAiLoading(false);
      addToHistory(query, false, 'ai-learning');
    }
  };

  // Submit exercise answer
  const submitExercise = () => {
    if (!query.trim() || !db) return;
    
    const lesson = aiLessons[currentAiLesson];
    const currentExercise = lesson.exercises[exerciseIndex];
    
    try {
      // Run user's query
      const userResult = db.exec(query);
      const userValues = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
      
      // Run expected query
      const expectedResult = db.exec(currentExercise.sql);
      const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
      
      // Compare results
      const isCorrect = userValues === expectedValues;
      
      setAiUserResult(userResult.length > 0 
        ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
        : { columns: [], rows: [], error: null });
      setResults(userResult.length > 0 
        ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
        : { columns: [], rows: [], error: null });
      setShowAiComparison(true);
      setExerciseAttempted(true);
      
      if (isCorrect) {
        const newCorrect = exerciseCorrect + 1;
        setExerciseCorrect(newCorrect);
        addToHistory(query, true, 'ai-exercise');
        
        // Check if all exercises complete
        if (exerciseIndex >= 4) {
          // All 5 exercises done!
          setXP(prev => prev + 100);
          setCompletedAiLessons(prev => new Set([...prev, lesson.id]));
          addToHistory(`Completed AI Lesson: ${lesson.title}`, true, 'ai-learning');
          setAiLessonPhase('complete');
          
          // Add congratulation message
          setAiMessages(prev => [...prev, { 
            role: "assistant", 
            content: `🎉 CONGRATULATIONS! You've completed all 5 exercises perfectly!\n\nYou've mastered "${lesson.title}" and earned 100 XP!\n\n${currentAiLesson < aiLessons.length - 1 ? "Ready for the next lesson? Click 'Next Lesson' to continue your SQL journey!" : "Amazing! You've completed all lessons in SQL Quest!"}`
          }]);
        } else {
          // Move to next exercise
          setExerciseIndex(prev => prev + 1);
          setExerciseAttempted(false);
          setQuery('');
          setAiUserResult({ columns: [], rows: [], error: null });
          setResults({ columns: [], rows: [], error: null });
          setShowAiComparison(false);
        }
      } else {
        addToHistory(query, false, 'ai-exercise');
      }
    } catch (err) {
      setResults({ columns: [], rows: [], error: err.message });
      setAiUserResult({ columns: [], rows: [], error: err.message });
      setShowAiComparison(true);
      addToHistory(query, false, 'ai-exercise');
    }
  };

  useEffect(() => {
    const initSQL = async () => {
      try {
        const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
        const database = new SQL.Database();
        setDb(database);
        loadDataset(database, 'titanic');
        setDbReady(true);
      } catch (err) { console.error('SQL.js init failed:', err); }
    };
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
    script.onload = initSQL;
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const loadDataset = (database, key) => {
    if (!database || !publicDatasets[key]) return;
    Object.entries(publicDatasets[key].tables).forEach(([tableName, tableData]) => {
      try {
        database.run(`DROP TABLE IF EXISTS ${tableName}`);
        const colTypes = tableData.columns.map((_, i) => {
          const sample = tableData.data[0]?.[i];
          return typeof sample === 'number' ? (Number.isInteger(sample) ? 'INTEGER' : 'REAL') : 'TEXT';
        });
        database.run(`CREATE TABLE ${tableName} (${tableData.columns.map((c, i) => `${c} ${colTypes[i]}`).join(', ')})`);
        const ph = tableData.columns.map(() => '?').join(', ');
        tableData.data.forEach(row => database.run(`INSERT INTO ${tableName} VALUES (${ph})`, row));
      } catch (err) { console.error(`Table ${tableName} error:`, err); }
    });
  };

  const selectDataset = (key) => {
    setCurrentDataset(key);
    if (db) {
      loadDataset(db, key);
      const newUsed = new Set([...datasetsUsed, key]);
      setDatasetsUsed(newUsed);
      if (newUsed.size >= 3 && !unlockedAchievements.has('data_explorer')) unlockAchievement('data_explorer');
    }
    setQuery(''); setResults({ columns: [], rows: [], error: null });
  };

  const unlockAchievement = (id) => {
    if (unlockedAchievements.has(id)) return;
    const ach = achievements.find(a => a.id === id);
    if (ach) { setUnlockedAchievements(prev => new Set([...prev, id])); setXP(prev => prev + ach.xp); setShowAchievement(ach); }
  };

  const runQuery = (customQuery, context = 'practice') => {
    const q = customQuery || query;
    if (!db || !q.trim()) return null;
    try {
      const result = db.exec(q);
      setResults(result.length ? { columns: result[0].columns, rows: result[0].values, error: null } : { columns: [], rows: [], error: null });
      const newCount = queryCount + 1; setQueryCount(newCount);
      if (!unlockedAchievements.has('first_query')) unlockAchievement('first_query');
      if (newCount >= 50 && !unlockedAchievements.has('query_50')) unlockAchievement('query_50');
      if (q.toLowerCase().includes('group by') && q.toLowerCase().includes('having') && !unlockedAchievements.has('analyst')) unlockAchievement('analyst');
      addToHistory(q, true, context);
      return { success: true, result };
    } catch (err) { 
      setResults({ columns: [], rows: [], error: err.message }); 
      addToHistory(q, false, context);
      return { success: false, error: err.message }; 
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase());
        const data = lines.slice(1).map(line => { const vals = []; let cur = '', inQ = false; for (const c of line) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ''; } else cur += c; } vals.push(cur.trim()); return vals; });
        const tableName = file.name.replace(/\.csv$/i, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        db.run(`DROP TABLE IF EXISTS ${tableName}`);
        db.run(`CREATE TABLE ${tableName} (${headers.map(h => `${h} TEXT`).join(', ')})`);
        const ph = headers.map(() => '?').join(', ');
        data.forEach(row => { if (row.length === headers.length) db.run(`INSERT INTO ${tableName} VALUES (${ph})`, row); });
        setCustomTables(prev => ({ ...prev, [tableName]: { columns: headers, rowCount: data.length } }));
        setQuery(`SELECT * FROM ${tableName} LIMIT 10`);
        if (!unlockedAchievements.has('csv_master')) unlockAchievement('csv_master');
        alert(`✅ Uploaded "${tableName}" with ${data.length} rows!`);
      } catch (err) { alert('CSV Error: ' + err.message); }
    };
    reader.readAsText(file);
  };

  // Challenge functions
  const openChallenge = (challenge) => {
    setCurrentChallenge(challenge);
    setChallengeQuery('');
    setChallengeResult({ columns: [], rows: [], error: null });
    setChallengeStatus(null);
    setShowChallengeHint(false);
    
    // Load the appropriate dataset
    if (db && challenge.dataset) {
      loadDataset(db, challenge.dataset);
      
      // Calculate expected result
      try {
        const result = db.exec(challenge.solution);
        if (result.length > 0) {
          setChallengeExpected({ columns: result[0].columns, rows: result[0].values });
        } else {
          setChallengeExpected({ columns: [], rows: [] });
        }
      } catch (err) {
        console.error('Error calculating expected:', err);
        setChallengeExpected({ columns: [], rows: [] });
      }
    }
  };

  const runChallengeQuery = () => {
    if (!db || !challengeQuery.trim()) return;
    try {
      const result = db.exec(challengeQuery);
      if (result.length > 0) {
        setChallengeResult({ columns: result[0].columns, rows: result[0].values, error: null });
      } else {
        setChallengeResult({ columns: [], rows: [], error: null });
      }
      setChallengeStatus(null);
      addToHistory(challengeQuery, true, 'challenge');
    } catch (err) {
      setChallengeResult({ columns: [], rows: [], error: err.message });
      setChallengeStatus(null);
      addToHistory(challengeQuery, false, 'challenge');
    }
  };

  const submitChallenge = () => {
    if (!db || !challengeQuery.trim() || !currentChallenge) return;
    try {
      const userResult = db.exec(challengeQuery);
      const expectedResultData = db.exec(currentChallenge.solution);
      
      const userValues = userResult.length ? JSON.stringify(userResult[0].values) : '[]';
      const expectedValues = expectedResultData.length ? JSON.stringify(expectedResultData[0].values) : '[]';
      
      if (userValues === expectedValues) {
        setChallengeStatus('success');
        addToHistory(challengeQuery, true, `challenge #${currentChallenge.id} ✓`);
        if (!solvedChallenges.has(currentChallenge.id)) {
          const newSolved = new Set([...solvedChallenges, currentChallenge.id]);
          setSolvedChallenges(newSolved);
          setXP(prev => prev + currentChallenge.xpReward);
          setStreak(prev => {
            const ns = prev + 1;
            if (ns >= 3 && !unlockedAchievements.has('streak_3')) unlockAchievement('streak_3');
            if (ns >= 5 && !unlockedAchievements.has('streak_5')) unlockAchievement('streak_5');
            return ns;
          });
          
          // Challenge achievements
          if (newSolved.size >= 5 && !unlockedAchievements.has('challenge_5')) unlockAchievement('challenge_5');
          if (newSolved.size >= 10 && !unlockedAchievements.has('challenge_10')) unlockAchievement('challenge_10');
          if (newSolved.size >= 20 && !unlockedAchievements.has('challenge_20')) unlockAchievement('challenge_20');
          if (newSolved.size >= challenges.length && !unlockedAchievements.has('challenge_all')) unlockAchievement('challenge_all');
        }
        if (userResult.length > 0) {
          setChallengeResult({ columns: userResult[0].columns, rows: userResult[0].values, error: null });
        }
      } else {
        setChallengeStatus('wrong');
        setStreak(0);
        addToHistory(challengeQuery, false, `challenge #${currentChallenge.id} ✗`);
        if (userResult.length > 0) {
          setChallengeResult({ columns: userResult[0].columns, rows: userResult[0].values, error: null });
        } else {
          setChallengeResult({ columns: [], rows: [], error: null });
        }
      }
    } catch (err) {
      setChallengeResult({ columns: [], rows: [], error: err.message });
      setChallengeStatus('wrong');
      setStreak(0);
    }
  };

  const getFilteredChallenges = () => {
    return challenges.filter(c => {
      if (challengeFilter === 'all') return true;
      if (challengeFilter === 'easy') return c.difficulty === 'Easy';
      if (challengeFilter === 'medium') return c.difficulty === 'Medium';
      if (challengeFilter === 'hard') return c.difficulty === 'Hard';
      if (challengeFilter === 'solved') return solvedChallenges.has(c.id);
      if (challengeFilter === 'unsolved') return !solvedChallenges.has(c.id);
      return true;
    });
  };

  const currentLevel = levels.reduce((acc, l) => xp >= l.minXP ? l : acc, levels[0]);
  const nextLevel = levels.find(l => l.minXP > xp) || levels[levels.length - 1];
  const dataset = publicDatasets[currentDataset];

  // Auth Screen
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Database size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">SQL Quest</h1>
            <p className="text-gray-400 mt-2">Learn SQL with Real Data</p>
          </div>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'login' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${authMode === 'register' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Register
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
            >
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Your progress will be saved automatically.<br />
              Compete on the global leaderboard!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dbReady) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center"><Database className="animate-spin text-purple-500 mx-auto mb-4" size={48} /><p className="text-white text-xl">Loading SQL Engine...</p><p className="text-gray-400 text-sm mt-2">Initializing datasets...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {showAchievement && <AchievementPopup achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">👤 Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {currentUser?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentUser}</h3>
                <p className="text-purple-300">{currentLevel.name} • {xp} XP</p>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{queryCount}</p>
                <p className="text-xs text-gray-400">Queries</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{solvedChallenges.size}</p>
                <p className="text-xs text-gray-400">Challenges</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-cyan-400">{completedAiLessons.size}</p>
                <p className="text-xs text-gray-400">AI Lessons</p>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-400">{unlockedAchievements.size}</p>
                <p className="text-xs text-gray-400">Achievements</p>
              </div>
            </div>
            
            {/* Query History */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 flex items-center gap-2"><History size={18} /> Recent Queries</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queryHistory.slice(-10).reverse().map((entry, i) => (
                  <div key={i} className={`p-2 rounded-lg text-sm font-mono ${entry.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.success ? '✓' : '✗'} {entry.context}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 truncate">{entry.sql}</p>
                  </div>
                ))}
                {queryHistory.length === 0 && <p className="text-gray-500 text-sm">No queries yet</p>}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      )}
      
      <header className="bg-black/30 border-b border-purple-500/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center"><Database size={24} /></div>
            <div><h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">SQL Quest</h1><p className="text-xs text-gray-400">Real Data • Real SQL</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Flame className={streak > 0 ? 'text-orange-400' : 'text-gray-600'} size={18} /><span className="font-bold">{streak}</span></div>
            <div className="flex gap-1">{[1,2,3].map(i => <Heart key={i} size={16} className={i <= lives ? 'text-red-500 fill-red-500' : 'text-gray-600'} />)}</div>
            <div className="w-28"><XPBar current={xp} max={nextLevel.minXP} level={currentLevel} /></div>
            <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                {currentUser?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{currentUser}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ id: 'learn', label: '🤖 AI Tutor' }, { id: 'exercises', label: '📝 Exercises' }, { id: 'challenges', label: '⚔️ Challenges' }, { id: 'achievements', label: '🏆 Stats' }, { id: 'leaderboard', label: '👑 Leaderboard' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === t.id ? 'bg-purple-600' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'learn' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Lesson List */}
            <div className="lg:col-span-1">
              <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <BookOpen size={18} className="text-cyan-400" /> AI Lessons
                </h2>
                <p className="text-xs text-gray-400 mb-3">{completedAiLessons.size}/{aiLessons.length} completed</p>
                <div className="space-y-1">
                  {aiLessons.map((lesson, i) => {
                    const isCompleted = completedAiLessons.has(lesson.id);
                    const isActive = currentAiLesson === i && aiMessages.length > 0;
                    const isInProgress = currentAiLesson === i && aiMessages.length > 0 && !isCompleted;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => startAiLesson(i)}
                        className={`w-full p-2 rounded-lg text-left transition-all text-sm ${
                          isActive
                            ? 'bg-cyan-500/30 border border-cyan-500'
                            : isCompleted
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs ${isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>#{lesson.id}</span>
                          <span className="flex-1 truncate">{lesson.title}</span>
                          {isCompleted && <CheckCircle size={14} className="text-green-400" />}
                          {isInProgress && <span className="text-xs text-yellow-400">●</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Progress */}
                {aiMessages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Current Session</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400">Coding:</span>
                        <span>{consecutiveCorrect}/3 🔥</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Total asked:</span>
                        <span>{aiQuestionCount} (✓{aiCorrectCount})</span>
                      </div>
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback' || comprehensionCount > 0) && (
                        <>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-purple-400">Concepts:</span>
                            <span>{comprehensionConsecutive}/3 🔥</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Total asked:</span>
                            <span>{comprehensionCount} (✓{comprehensionCorrect})</span>
                          </div>
                        </>
                      )}
                      {lessonAttempts > 0 && (
                        <div className="flex items-center justify-between text-orange-400 mt-2">
                          <span>Attempts:</span>
                          <span>{lessonAttempts + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Phase: {
                        aiLessonPhase === 'comprehension' ? '🧠 Concept Check' :
                        aiLessonPhase === 'comprehension_feedback' ? '📝 Review' :
                        aiLessonPhase
                      }</p>
                      {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                        <p className="text-xs text-gray-600 mt-1">Get 3 correct in a row to advance!</p>
                      )}
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                        <p className="text-xs text-gray-600 mt-1">Get 3 correct to complete lesson!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 space-y-4">
              {aiMessages.length === 0 ? (
                <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap size={40} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">AI SQL Tutor</h2>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Learn SQL interactively with your personal AI tutor. Each lesson includes teaching, examples, and practice questions with real-time feedback.
                  </p>
                  
                  {/* Show progress if user has completed lessons */}
                  {completedAiLessons.size > 0 && (
                    <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/30 max-w-md mx-auto">
                      <p className="text-green-400 font-medium mb-2">Welcome back! 🎉</p>
                      <p className="text-sm text-gray-400">
                        You've completed {completedAiLessons.size} of {aiLessons.length} lessons
                      </p>
                      <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500" 
                          style={{ width: `${(completedAiLessons.size / aiLessons.length) * 100}%` }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-center flex-wrap">
                    {completedAiLessons.size > 0 && completedAiLessons.size < aiLessons.length ? (
                      <>
                        <button
                          onClick={() => {
                            // Find next incomplete lesson
                            const nextLesson = aiLessons.findIndex(l => !completedAiLessons.has(l.id));
                            startAiLesson(nextLesson >= 0 ? nextLesson : 0);
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                        >
                          Continue Learning →
                        </button>
                        <button
                          onClick={() => startAiLesson(0)}
                          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-white transition-all"
                        >
                          Start Over
                        </button>
                      </>
                    ) : completedAiLessons.size >= aiLessons.length ? (
                      <>
                        <button
                          onClick={() => startAiLesson(0)}
                          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                        >
                          Review Lessons 🔄
                        </button>
                        <p className="w-full text-green-400 mt-2">🏆 All lessons completed!</p>
                      </>
                    ) : (
                      <button
                        onClick={() => startAiLesson(0)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:from-cyan-600 hover:to-blue-600 transition-all"
                      >
                        Start Learning →
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-2xl mx-auto">
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-cyan-400 font-bold text-lg">10</p>
                      <p className="text-xs text-gray-400">Lessons</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-green-400 font-bold text-lg">Interactive</p>
                      <p className="text-xs text-gray-400">Teaching</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-yellow-400 font-bold text-lg">Real-time</p>
                      <p className="text-xs text-gray-400">Feedback</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <p className="text-purple-400 font-bold text-lg">+50 XP</p>
                      <p className="text-xs text-gray-400">Per Lesson</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Lesson Header */}
                  <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-cyan-400 mb-1">Lesson {aiLessons[currentAiLesson].id}</p>
                        <h2 className="text-xl font-bold">{aiLessons[currentAiLesson].title}</h2>
                        <p className="text-sm text-gray-400">{aiLessons[currentAiLesson].topic}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Streak indicator */}
                        {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={`w-3 h-3 rounded-full ${i < consecutiveCorrect ? 'bg-green-500' : 'bg-gray-600'}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">🔥</span>
                          </div>
                        )}
                        {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                          <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={`w-3 h-3 rounded-full ${i < comprehensionConsecutive ? 'bg-purple-500' : 'bg-gray-600'}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">🧠</span>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          aiLessonPhase === 'intro' ? 'bg-blue-500/20 text-blue-400' :
                          aiLessonPhase === 'teaching' ? 'bg-cyan-500/20 text-cyan-400' :
                          aiLessonPhase === 'practice' ? 'bg-yellow-500/20 text-yellow-400' :
                          aiLessonPhase === 'feedback' ? 'bg-green-500/20 text-green-400' :
                          aiLessonPhase === 'comprehension' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-pink-500/20 text-pink-400'
                        }`}>
                          {aiLessonPhase === 'intro' ? '👋 Introduction' :
                           aiLessonPhase === 'teaching' ? '📖 Learning' :
                           aiLessonPhase === 'practice' ? '✍️ Practice' :
                           aiLessonPhase === 'feedback' ? '💬 Feedback' :
                           aiLessonPhase === 'comprehension' ? '🧠 Comprehension' :
                           '📝 Review'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4 h-80 overflow-y-auto">
                    <div className="space-y-4">
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl ${
                            msg.role === 'user' 
                              ? 'bg-purple-500/20 border border-purple-500/30' 
                              : 'bg-cyan-500/10 border border-cyan-500/30'
                          }`}>
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                                  <Zap size={12} />
                                </div>
                                <span className="text-xs text-cyan-400 font-medium">AI Tutor</span>
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap">
                              {msg.content
                                .replace(/\*\*/g, '') // Remove markdown bold
                                .replace(/\*/g, '')   // Remove markdown italic
                                .split('```').map((part, j) => 
                                j % 2 === 1 ? (
                                  <pre key={j} className="bg-gray-900 text-green-400 p-2 rounded my-2 overflow-x-auto font-mono text-xs">
                                    {part.replace(/^sql\n?/, '')}
                                  </pre>
                                ) : (
                                  <span key={j}>
                                    {part.split(/(QUESTION:)/g).map((segment, k) => 
                                      segment === 'QUESTION:' ? (
                                        <span key={k} className="block mt-4 mb-2 text-yellow-400 font-bold text-base">📝 QUESTION:</span>
                                      ) : (
                                        <span key={k}>{segment}</span>
                                      )
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                            {/* Show expected output inline for the last question */}
                            {msg.role === 'assistant' && i === aiMessages.length - 1 && (aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && !aiLoading && aiExpectedResult.rows.length > 0 && expectedResultMessageId === i && (
                              <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                <p className="text-xs text-blue-300 font-medium mb-2">📋 Expected Output ({aiExpectedResult.rows.length} rows)</p>
                                <div className="overflow-auto max-h-32">
                                  <table className="min-w-full text-xs border border-blue-500/30">
                                    <thead className="bg-blue-500/20">
                                      <tr>
                                        {aiExpectedResult.columns.map((col, ci) => (
                                          <th key={ci} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {aiExpectedResult.rows.slice(0, 5).map((row, ri) => (
                                        <tr key={ri} className="hover:bg-blue-500/10">
                                          {row.map((cell, ci) => (
                                            <td key={ci} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">
                                              {cell === null ? <span className="text-gray-500 italic">NULL</span> : String(cell)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {aiExpectedResult.rows.length > 5 && (
                                    <p className="text-xs text-blue-400 mt-1">+{aiExpectedResult.rows.length - 5} more rows</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex justify-start">
                          <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-xl">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SQL Editor for Practice */}
                  {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                    <div className="space-y-4">
                      {/* Submit Answer Section */}
                      <div className="bg-black/30 rounded-xl border border-green-500/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-green-300 text-sm">✍️ Submit Your Answer</h3>
                          <span className="text-xs text-gray-500">Use the SQL Sandbox below to test first!</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">When you're confident in your answer, paste it here and submit for AI feedback.</p>
                        <textarea
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Paste your final SQL answer here..."
                          className="w-full h-20 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-green-500 focus:outline-none resize-none"
                          spellCheck={false}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={runAiQuery}
                            disabled={aiLoading || !query.trim()}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play size={16} /> Test
                          </button>
                          <button
                            onClick={submitAiQuery}
                            disabled={aiLoading || !query.trim()}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircle size={16} /> Submit Answer
                          </button>
                        </div>
                      </div>

                      {/* User's Result Table */}
                      {showAiComparison && (
                        <div className={`bg-black/30 rounded-xl border p-4 ${
                          aiUserResult.error 
                            ? 'border-red-500/30' 
                            : aiExpectedResult.rows.length === 0
                              ? 'border-blue-500/30'  // No expected to compare
                              : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                ? 'border-green-500/30'
                                : 'border-orange-500/30'
                        }`}>
                          <h3 className={`font-bold mb-3 text-sm flex items-center gap-2 ${
                            aiUserResult.error 
                              ? 'text-red-300' 
                              : aiExpectedResult.rows.length === 0
                                ? 'text-blue-300'
                                : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                  ? 'text-green-300'
                                  : 'text-orange-300'
                          }`}>
                            {aiUserResult.error ? (
                              <>❌ Error</>
                            ) : aiExpectedResult.rows.length === 0 ? (
                              <>📊 Your Output ({aiUserResult.rows.length} rows)</>
                            ) : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows) ? (
                              <>✅ Your Output - Correct! ({aiUserResult.rows.length} rows)</>
                            ) : (
                              <>⚠️ Your Output ({aiUserResult.rows.length} rows) - Check the differences</>
                            )}
                          </h3>
                          
                          {aiUserResult.error ? (
                            <div className="p-3 bg-red-500/10 rounded-lg">
                              <p className="text-red-400 text-sm font-mono">{aiUserResult.error}</p>
                            </div>
                          ) : aiUserResult.rows.length > 0 ? (
                            <div className="overflow-auto max-h-48">
                              <table className="min-w-full text-xs border border-gray-600">
                                <thead className={`${
                                  aiExpectedResult.rows.length === 0
                                    ? 'bg-blue-500/20'
                                    : JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows)
                                      ? 'bg-green-500/20'
                                      : 'bg-orange-500/20'
                                }`}>
                                  <tr>
                                    {aiUserResult.columns.map((col, i) => (
                                      <th key={i} className="px-3 py-2 text-left font-medium text-gray-300 border-b border-gray-600">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {aiUserResult.rows.slice(0, 10).map((row, i) => {
                                    const expectedRow = aiExpectedResult.rows[i];
                                    const noExpected = aiExpectedResult.rows.length === 0;
                                    const rowMatches = noExpected || (expectedRow && JSON.stringify(row) === JSON.stringify(expectedRow));
                                    return (
                                      <tr key={i} className={noExpected ? '' : (rowMatches ? 'bg-green-500/5' : 'bg-red-500/5')}>
                                        {row.map((cell, j) => {
                                          const cellMatches = noExpected || (expectedRow && String(cell) === String(expectedRow[j]));
                                          return (
                                            <td key={j} className={`px-3 py-1.5 border-b border-gray-700 ${cellMatches ? 'text-gray-300' : 'text-red-400'}`}>
                                              {cell === null ? <span className="text-gray-500 italic">NULL</span> : String(cell)}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {aiUserResult.rows.length > 10 && (
                                <p className="text-xs text-gray-400 mt-2">Showing 10 of {aiUserResult.rows.length} rows</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">Query returned no results.</p>
                          )}

                          {/* Comparison Summary */}
                          {!aiUserResult.error && aiExpectedResult.rows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700 text-xs">
                              <div className="flex gap-4">
                                <span className="text-gray-400">
                                  Expected: <span className="text-blue-400">{aiExpectedResult.rows.length} rows</span>
                                </span>
                                <span className="text-gray-400">
                                  Got: <span className={aiUserResult.rows.length === aiExpectedResult.rows.length ? 'text-green-400' : 'text-red-400'}>
                                    {aiUserResult.rows.length} rows
                                  </span>
                                </span>
                                {JSON.stringify(aiUserResult.rows) === JSON.stringify(aiExpectedResult.rows) && (
                                  <span className="text-green-400">✓ Perfect match!</span>
                                )}
                              </div>
                            </div>
                          )}
                          {!aiUserResult.error && aiExpectedResult.rows.length === 0 && aiUserResult.rows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                              Submit your answer for AI evaluation.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Input */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                        placeholder={
                          aiLessonPhase === 'intro' ? "Say 'ready' to start learning..." :
                          aiLessonPhase === 'teaching' ? "Ask questions or say 'practice' when ready..." :
                          aiLessonPhase === 'practice' ? "Use the SQL Sandbox below, or ask for hints..." :
                          aiLessonPhase === 'feedback' ? "Continue or click 'Start Comprehension Check'..." :
                          aiLessonPhase === 'comprehension' ? "Explain the concept in your own words..." :
                          aiLessonPhase === 'comprehension_feedback' ? "Continue the conversation..." :
                          "Continue the conversation..."
                        }
                        disabled={aiLoading}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={sendAiMessage}
                        disabled={aiLoading || !aiInput.trim()}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium disabled:opacity-50 transition-all"
                      >
                        Send
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {aiLessonPhase === 'intro' && (
                        <button onClick={() => sendQuickMessage("I'm ready to learn!", 'teaching')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          I'm ready! →
                        </button>
                      )}
                      {aiLessonPhase === 'teaching' && (
                        <>
                          <button onClick={() => { setAiInput("Can you give me an example?"); }} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                            Show example
                          </button>
                          <button onClick={() => sendQuickMessage("I'm ready to practice!", 'practice')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                            Ready to practice →
                          </button>
                        </>
                      )}
                      {aiLessonPhase === 'practice' && (
                        <button onClick={() => { setAiInput("Can you give me a hint?"); }} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Get a hint 💡
                        </button>
                      )}
                      {aiLessonPhase === 'feedback' && consecutiveCorrect < 3 && (
                        <button onClick={() => sendQuickMessage("Give me another question!", 'practice')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Next question →
                        </button>
                      )}
                      {aiLessonPhase === 'feedback' && consecutiveCorrect >= 3 && (
                        <button onClick={() => sendQuickMessage("I'm ready for the comprehension questions!", 'comprehension')} className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded text-purple-400">
                          Start Comprehension Check 🧠
                        </button>
                      )}
                      {(aiLessonPhase === 'comprehension' || aiLessonPhase === 'comprehension_feedback') && (
                        <>
                          <span className="text-xs text-gray-500">
                            Streak: {comprehensionConsecutive}/3 🔥
                          </span>
                        </>
                      )}
                      {aiLessonPhase === 'comprehension_feedback' && comprehensionConsecutive < 3 && (
                        <button onClick={() => sendQuickMessage("Give me another concept question.", 'comprehension')} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">
                          Next concept question →
                        </button>
                      )}
                      {aiLessonPhase === 'comprehension_feedback' && comprehensionConsecutive >= 3 && (
                        <button 
                          onClick={() => {
                            // Complete the lesson
                            const lesson = aiLessons[currentAiLesson];
                            setXP(prev => prev + 50);
                            setCompletedAiLessons(prev => new Set([...prev, lesson.id]));
                            addToHistory(`Completed AI Lesson: ${lesson.title}`, true, 'ai-learning');
                            setAiMessages(prev => [...prev, { 
                              role: "assistant", 
                              content: `🎉 CONGRATULATIONS! You've completed "${lesson.title}"!\n\nYou earned 50 XP! ${currentAiLesson < aiLessons.length - 1 ? "\n\nReady for the next lesson? Click 'Next Lesson' to continue!\n\n💡 Tip: Check out the Exercises tab for more practice on this topic!" : "\n\nAmazing! You've completed all AI Tutor lessons!"}`
                            }]);
                          }} 
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded text-white font-medium"
                        >
                          🎉 Complete Lesson!
                        </button>
                      )}
                      {completedAiLessons.has(aiLessons[currentAiLesson]?.id) && currentAiLesson < aiLessons.length - 1 && (
                        <button 
                          onClick={() => startAiLesson(currentAiLesson + 1)} 
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded text-white font-medium"
                        >
                          Next Lesson →
                        </button>
                      )}
                      {/* Always show restart option */}
                      {aiLessonPhase !== 'intro' && (
                        <button onClick={() => startAiLesson(currentAiLesson, true)} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-500">
                          ↺ Restart
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SQL Sandbox - Always Available */}
                  <div className="bg-black/30 rounded-xl border border-purple-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                        <Database size={16} /> SQL Sandbox
                      </h3>
                      <span className="text-xs text-gray-500">Test queries anytime • Table: {aiLessons[currentAiLesson]?.practiceTable}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Query Input */}
                      <div>
                        <textarea
                          value={sandboxQuery}
                          onChange={(e) => setSandboxQuery(e.target.value)}
                          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSandboxQuery(); }}}
                          placeholder="Write SQL here to explore the data... (Ctrl+Enter to run)"
                          className="w-full h-28 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                          spellCheck={false}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={runSandboxQuery}
                            disabled={!sandboxQuery.trim()}
                            className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Play size={14} /> Run
                          </button>
                          {(aiLessonPhase === 'practice' || aiLessonPhase === 'feedback') && (
                            <button
                              onClick={copySandboxToAnswer}
                              disabled={!sandboxQuery.trim()}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-sm disabled:opacity-50"
                              title="Copy to answer editor"
                            >
                              📋 Use as Answer
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Results */}
                      <div className="bg-gray-900/50 rounded-lg p-3 overflow-auto max-h-40">
                        {sandboxResult.error ? (
                          <div className="text-red-400 text-xs">
                            <p className="font-medium mb-1">❌ Error:</p>
                            <p className="font-mono">{sandboxResult.error}</p>
                          </div>
                        ) : sandboxResult.columns.length > 0 ? (
                          <div>
                            <p className="text-green-400 text-xs mb-2">✓ {sandboxResult.rows.length} rows</p>
                            <table className="min-w-full text-xs border border-gray-700">
                              <thead className="bg-gray-800">
                                <tr>
                                  {sandboxResult.columns.map((col, i) => (
                                    <th key={i} className="px-2 py-1 text-left font-medium text-gray-400 border-b border-gray-700">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sandboxResult.rows.slice(0, 5).map((row, i) => (
                                  <tr key={i} className="hover:bg-gray-800/50">
                                    {row.map((cell, j) => (
                                      <td key={j} className="px-2 py-1 border-b border-gray-800 text-gray-300">
                                        {cell === null ? <span className="text-gray-500">NULL</span> : String(cell).slice(0, 20)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {sandboxResult.rows.length > 5 && (
                              <p className="text-xs text-gray-500 mt-1">+{sandboxResult.rows.length - 5} more rows</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Run a query to see results here</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick table info */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500 mb-1">Available columns:</p>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const lesson = aiLessons[currentAiLesson];
                          const ds = publicDatasets[lesson?.dataset || 'titanic'];
                          const table = ds?.tables[lesson?.practiceTable];
                          return table?.columns.map((col, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">{col}</span>
                          )) || null;
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Lesson Selection Sidebar */}
            <div className="space-y-4">
              <div className="bg-black/30 rounded-xl border border-pink-500/30 p-4">
                <h2 className="font-bold mb-3 flex items-center gap-2 text-pink-400">
                  📚 Lessons
                </h2>
                <div className="space-y-2">
                  {aiLessons.map((lesson, idx) => {
                    const completedCount = lesson.exercises.filter((_, i) => 
                      completedExercises.has(`${lesson.id}-${i}`)
                    ).length;
                    const isComplete = completedCount === 5;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setSelectedExerciseLesson(idx);
                          setCurrentExerciseIndex(0);
                          setExerciseQuery('');
                          setShowExerciseResult(false);
                          setExerciseResult({ columns: [], rows: [], error: null });
                          // Load the appropriate dataset
                          if (db) {
                            if (lesson.practiceTable === 'passengers') loadDataset(db, 'titanic');
                            else if (lesson.practiceTable === 'movies') loadDataset(db, 'movies');
                            else if (lesson.practiceTable === 'employees') loadDataset(db, 'employees');
                            else loadDataset(db, 'ecommerce');
                          }
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedExerciseLesson === idx 
                            ? 'bg-pink-500/30 border border-pink-500' 
                            : 'hover:bg-gray-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{lesson.title}</span>
                          {isComplete && <span className="text-green-400">✓</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${
                                completedExercises.has(`${lesson.id}-${i}`) 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-600'
                              }`} 
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{completedCount}/5</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Progress Summary */}
              <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-sm mb-2 text-gray-400">Overall Progress</h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-400">
                    {completedExercises.size}/{aiLessons.length * 5}
                  </p>
                  <p className="text-xs text-gray-500">Exercises Completed</p>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all" 
                    style={{ width: `${(completedExercises.size / (aiLessons.length * 5)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Exercise Area */}
            <div className="lg:col-span-3 space-y-4">
              {/* Lesson Header */}
              <div className="bg-black/30 rounded-xl border border-pink-500/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-pink-400">
                    {aiLessons[selectedExerciseLesson].title}
                  </h2>
                  <span className="text-sm text-gray-400">
                    Table: <code className="text-pink-300">{aiLessons[selectedExerciseLesson].practiceTable}</code>
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{aiLessons[selectedExerciseLesson].topic}</p>
                
                {/* Exercise Progress Dots */}
                <div className="flex items-center gap-2 mt-4">
                  {aiLessons[selectedExerciseLesson].exercises.map((_, i) => {
                    const isCompleted = completedExercises.has(`${aiLessons[selectedExerciseLesson].id}-${i}`);
                    const isCurrent = i === currentExerciseIndex;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentExerciseIndex(i);
                          setExerciseQuery('');
                          setShowExerciseResult(false);
                          setExerciseResult({ columns: [], rows: [], error: null });
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                          isCompleted 
                            ? 'bg-green-500/30 text-green-400 border border-green-500' 
                            : isCurrent
                              ? 'bg-pink-500/30 text-pink-400 border border-pink-500 animate-pulse'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {isCompleted ? '✓' : i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Exercise */}
              <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400 font-medium">
                      Exercise {currentExerciseIndex + 1} of 5
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'easy' 
                        ? 'bg-green-500/20 text-green-400' 
                        : aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'easy' ? '🟢 Easy' :
                       aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].difficulty === 'medium' ? '🟡 Medium' :
                       '🔴 Hard'}
                    </span>
                  </div>
                  {completedExercises.has(`${aiLessons[selectedExerciseLesson].id}-${currentExerciseIndex}`) && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Completed</span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-4">
                  {aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].question}
                </h3>

                {/* Tables to Use (for JOIN exercises) */}
                {aiLessons[selectedExerciseLesson].joinTables && (
                  <div className="mb-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <p className="text-xs text-cyan-300 font-medium mb-2">🔗 Tables to JOIN:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {aiLessons[selectedExerciseLesson].joinTables.map((tableInfo, i) => (
                        <div key={i} className="text-xs bg-gray-800/50 rounded p-2">
                          <span className="text-cyan-400 font-bold">{tableInfo.split('(')[0].trim()}</span>
                          <span className="text-gray-400"> ({tableInfo.match(/\(([^)]+)\)/)?.[1]})</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">💡 Join key: <code className="text-cyan-300">customer_id</code></p>
                  </div>
                )}

                {/* Expected Output */}
                {db && (() => {
                  try {
                    const result = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                    if (result.length > 0) {
                      return (
                        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <p className="text-xs text-blue-300 font-medium mb-2">📋 Expected Output ({result[0].values.length} rows)</p>
                          <div className="overflow-auto max-h-40">
                            <table className="min-w-full text-xs border border-blue-500/30">
                              <thead className="bg-blue-500/20">
                                <tr>
                                  {result[0].columns.map((col, ci) => (
                                    <th key={ci} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {result[0].values.slice(0, 5).map((row, ri) => (
                                  <tr key={ri} className="hover:bg-blue-500/10">
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">
                                        {cell === null ? <span className="text-gray-500 italic">NULL</span> : String(cell).slice(0, 30)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {result[0].values.length > 5 && (
                              <p className="text-xs text-blue-400 mt-1">+{result[0].values.length - 5} more rows</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) { return null; }
                  return null;
                })()}

                {/* Query Input */}
                <textarea
                  value={exerciseQuery}
                  onChange={(e) => setExerciseQuery(e.target.value)}
                  placeholder="Write your SQL query here..."
                  className="w-full h-28 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-pink-500 focus:outline-none resize-none"
                  spellCheck={false}
                />

                {/* Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      if (!exerciseQuery.trim() || !db) return;
                      try {
                        const result = db.exec(exerciseQuery);
                        setExerciseResult(result.length > 0 
                          ? { columns: result[0].columns, rows: result[0].values, error: null }
                          : { columns: [], rows: [], error: null });
                        setShowExerciseResult(true);
                      } catch (err) {
                        setExerciseResult({ columns: [], rows: [], error: err.message });
                        setShowExerciseResult(true);
                      }
                    }}
                    disabled={!exerciseQuery.trim()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play size={16} /> Test
                  </button>
                  <button
                    onClick={() => {
                      if (!exerciseQuery.trim() || !db) return;
                      try {
                        const userResult = db.exec(exerciseQuery);
                        const userValues = userResult.length > 0 ? JSON.stringify(userResult[0].values) : '[]';
                        
                        const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                        const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                        
                        const isCorrect = userValues === expectedValues;
                        
                        setExerciseResult(userResult.length > 0 
                          ? { columns: userResult[0].columns, rows: userResult[0].values, error: null }
                          : { columns: [], rows: [], error: null });
                        setShowExerciseResult(true);
                        
                        if (isCorrect) {
                          const exerciseKey = `${aiLessons[selectedExerciseLesson].id}-${currentExerciseIndex}`;
                          if (!completedExercises.has(exerciseKey)) {
                            setCompletedExercises(prev => new Set([...prev, exerciseKey]));
                            setXP(prev => prev + 10);
                          }
                          
                          // Auto advance to next incomplete exercise
                          if (currentExerciseIndex < 4) {
                            setTimeout(() => {
                              setCurrentExerciseIndex(prev => prev + 1);
                              setExerciseQuery('');
                              setShowExerciseResult(false);
                              setExerciseResult({ columns: [], rows: [], error: null });
                            }, 1500);
                          }
                        }
                      } catch (err) {
                        setExerciseResult({ columns: [], rows: [], error: err.message });
                        setShowExerciseResult(true);
                      }
                    }}
                    disabled={!exerciseQuery.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} /> Submit Answer
                  </button>
                </div>

                {/* Result Display */}
                {showExerciseResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    exerciseResult.error 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : (() => {
                          try {
                            const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                            const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                            const userValues = exerciseResult.rows ? JSON.stringify(exerciseResult.rows) : '[]';
                            return userValues === expectedValues 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : 'bg-orange-500/10 border-orange-500/30';
                          } catch { return 'bg-orange-500/10 border-orange-500/30'; }
                        })()
                  }`}>
                    {exerciseResult.error ? (
                      <p className="text-red-400 text-sm">❌ Error: {exerciseResult.error}</p>
                    ) : (() => {
                      try {
                        const expectedResult = db.exec(aiLessons[selectedExerciseLesson].exercises[currentExerciseIndex].sql);
                        const expectedValues = expectedResult.length > 0 ? JSON.stringify(expectedResult[0].values) : '[]';
                        const userValues = exerciseResult.rows ? JSON.stringify(exerciseResult.rows) : '[]';
                        const isCorrect = userValues === expectedValues;
                        
                        return (
                          <>
                            <p className={`text-sm font-bold mb-3 ${isCorrect ? 'text-green-400' : 'text-orange-400'}`}>
                              {isCorrect ? '✅ Correct! +10 XP' : '⚠️ Not quite right. Check your query.'}
                            </p>
                            <p className="text-xs text-gray-400 mb-2">Your Output ({exerciseResult.rows.length} rows):</p>
                            <div className="overflow-auto max-h-32">
                              <table className="min-w-full text-xs border border-gray-600">
                                <thead className="bg-gray-800">
                                  <tr>
                                    {exerciseResult.columns.map((col, ci) => (
                                      <th key={ci} className="px-2 py-1 text-left font-medium text-gray-300 border-b border-gray-600">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {exerciseResult.rows.slice(0, 5).map((row, ri) => (
                                    <tr key={ri}>
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1 border-b border-gray-700 text-gray-300">
                                          {cell === null ? <span className="text-gray-500 italic">NULL</span> : String(cell).slice(0, 30)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      } catch { return <p className="text-red-400 text-sm">Error checking result.</p>; }
                    })()}
                  </div>
                )}
              </div>

              {/* Table Schema Reference */}
              <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-sm mb-2 text-gray-400">📋 Available Tables & Columns</h3>
                {aiLessons[selectedExerciseLesson].joinTables ? (
                  <div className="space-y-3">
                    {aiLessons[selectedExerciseLesson].joinTables.map((tableInfo, i) => (
                      <div key={i} className="p-2 bg-gray-800/50 rounded-lg">
                        <p className="text-xs text-cyan-400 font-mono mb-1">{tableInfo.split('(')[0].trim()}</p>
                        <div className="flex flex-wrap gap-1">
                          {tableInfo.match(/\(([^)]+)\)/)?.[1].split(',').map((col, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 font-mono">{col.trim()}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-yellow-400 mt-2">💡 Tip: Join tables using customer_id as the key</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const lesson = aiLessons[selectedExerciseLesson];
                      const tableName = lesson.practiceTable;
                      const ds = tableName === 'passengers' ? publicDatasets.titanic 
                               : tableName === 'movies' ? publicDatasets.movies
                               : tableName === 'employees' ? publicDatasets.employees
                               : publicDatasets.ecommerce;
                      const table = ds?.tables[tableName];
                      return table?.columns.map((col, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">{col}</span>
                      )) || null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Challenge List */}
            {!currentChallenge ? (
              <>
                <div className="lg:col-span-3">
                  {/* Header & Filters */}
                  <div className="bg-black/30 rounded-xl border border-orange-500/30 p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-orange-400">⚔️ SQL Challenges</h2>
                        <p className="text-gray-400 text-sm">LeetCode-style problems to test your skills</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Solved: {solvedChallenges.size}/{challenges.length}</span>
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${(solvedChallenges.size / challenges.length) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'easy', label: '🟢 Easy' },
                        { id: 'medium', label: '🟡 Medium' },
                        { id: 'hard', label: '🔴 Hard' },
                        { id: 'solved', label: '✅ Solved' },
                        { id: 'unsolved', label: '⬜ Unsolved' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setChallengeFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${challengeFilter === f.id ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Challenge Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredChallenges().map(c => {
                      const isSolved = solvedChallenges.has(c.id);
                      const diffColor = c.difficulty === 'Easy' ? 'text-green-400' : c.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400';
                      return (
                        <button
                          key={c.id}
                          onClick={() => openChallenge(c)}
                          className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${isSolved ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/50 border-gray-700 hover:border-orange-500/50'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-mono text-gray-500">#{c.id}</span>
                            <div className="flex items-center gap-2">
                              {isSolved && <CheckCircle size={16} className="text-green-500" />}
                              <span className={`text-xs font-bold ${diffColor}`}>{c.difficulty}</span>
                            </div>
                          </div>
                          <h3 className="font-bold text-white mb-1">{c.title}</h3>
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{c.description.replace(/\*\*/g, '')}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{c.category}</span>
                            <span className="text-xs text-yellow-400">+{c.xpReward} XP</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Challenge Detail View */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Back Button & Title */}
                  <div className="bg-black/30 rounded-xl border border-orange-500/30 p-4">
                    <button onClick={() => setCurrentChallenge(null)} className="text-sm text-orange-400 hover:text-orange-300 mb-3 flex items-center gap-1">
                      <ChevronLeft size={16} /> Back to Challenges
                    </button>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-gray-500">#{currentChallenge.id}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentChallenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : currentChallenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            {currentChallenge.difficulty}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{currentChallenge.category}</span>
                        </div>
                        <h2 className="text-2xl font-bold">{currentChallenge.title}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-yellow-400 font-bold">+{currentChallenge.xpReward} XP</span>
                        {solvedChallenges.has(currentChallenge.id) && <p className="text-green-400 text-sm">✅ Solved</p>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Problem Description */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <h3 className="font-bold mb-3 text-gray-300">📝 Problem</h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      {currentChallenge.description.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-orange-400">{part}</strong> : <span key={i}>{part}</span>
                      )}
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Tables used:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentChallenge.tables.map(t => (
                          <span key={t} className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Example */}
                    <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-blue-300 font-medium mb-2">Example:</p>
                      <p className="text-sm text-gray-300"><strong>Input:</strong> {currentChallenge.example.input}</p>
                      <p className="text-sm text-gray-300 mt-1"><strong>Output:</strong> {currentChallenge.example.output}</p>
                    </div>
                  </div>
                  
                  {/* Expected Output */}
                  {challengeExpected.rows.length > 0 && (
                    <div className="bg-black/30 rounded-xl border border-blue-500/30 p-4">
                      <h3 className="font-bold mb-3 text-blue-300">📋 Expected Output ({challengeExpected.rows.length} rows)</h3>
                      <div className="overflow-auto max-h-48">
                        <table className="min-w-full text-xs border border-blue-500/30">
                          <thead className="bg-blue-500/20">
                            <tr>{challengeExpected.columns.map((c, i) => <th key={i} className="px-2 py-1 text-left font-medium text-blue-300 border-b border-blue-500/30">{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {challengeExpected.rows.slice(0, 15).map((row, i) => (
                              <tr key={i} className="hover:bg-blue-500/10">
                                {row.map((cell, j) => <td key={j} className="px-2 py-1 border-b border-blue-500/20 text-gray-300">{cell === null ? <span className="text-gray-500">NULL</span> : String(cell)}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {challengeExpected.rows.length > 15 && <p className="text-xs text-blue-400 mt-1">Showing 15 of {challengeExpected.rows.length} rows</p>}
                      </div>
                    </div>
                  )}
                  
                  {/* SQL Editor */}
                  <div className="bg-black/30 rounded-xl border border-purple-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-300">💻 Your Solution</h3>
                      <button onClick={() => setShowChallengeHint(!showChallengeHint)} className="text-sm text-yellow-400 hover:text-yellow-300">
                        {showChallengeHint ? '🙈 Hide Hint' : '💡 Show Hint'}
                      </button>
                    </div>
                    
                    {showChallengeHint && (
                      <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-300">{currentChallenge.hint}</p>
                      </div>
                    )}
                    
                    <textarea
                      value={challengeQuery}
                      onChange={(e) => setChallengeQuery(e.target.value)}
                      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitChallenge(); }}}
                      placeholder="Write your SQL solution here..."
                      className="w-full h-40 p-3 font-mono text-sm bg-gray-900 text-green-400 rounded-lg border-2 border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                      spellCheck={false}
                    />
                    
                    <div className="flex gap-2 mt-3">
                      <button onClick={runChallengeQuery} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2">
                        <Play size={16} /> Run
                      </button>
                      <button onClick={submitChallenge} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Submit
                      </button>
                    </div>
                  </div>
                  
                  {/* Result Status */}
                  {challengeStatus && (
                    <div className={`p-4 rounded-xl border ${challengeStatus === 'success' ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                      {challengeStatus === 'success' ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-500" size={24} />
                          <div>
                            <p className="font-bold text-green-400">✅ Accepted!</p>
                            <p className="text-sm text-gray-400">Your solution is correct. +{currentChallenge.xpReward} XP</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Target className="text-red-500" size={24} />
                          <div>
                            <p className="font-bold text-red-400">❌ Wrong Answer</p>
                            <p className="text-sm text-gray-400">Your output doesn't match the expected result. Try again!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Your Output */}
                  {(challengeResult.columns.length > 0 || challengeResult.error) && (
                    <div className="bg-black/30 rounded-xl border border-green-500/30 p-4">
                      <h3 className="font-bold mb-3 text-green-300">📊 Your Output {challengeResult.rows?.length > 0 && `(${challengeResult.rows.length} rows)`}</h3>
                      <ResultsTable columns={challengeResult.columns} rows={challengeResult.rows} error={challengeResult.error} />
                    </div>
                  )}
                </div>
                
                {/* Sidebar - Schema */}
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl border border-blue-500/30 p-4">
                    <h3 className="font-bold mb-3 text-blue-300">📋 Table Schema</h3>
                    {currentChallenge.tables.map(tableName => {
                      const ds = publicDatasets[currentChallenge.dataset];
                      const table = ds?.tables[tableName];
                      if (!table) return null;
                      return (
                        <div key={tableName} className="mb-4">
                          <p className="text-sm font-mono text-blue-400 font-bold">{tableName}</p>
                          <div className="mt-1 text-xs text-gray-400">
                            {table.columns.map((col, i) => (
                              <span key={col} className="inline-block mr-2 mb-1 px-1.5 py-0.5 bg-gray-800 rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Sample Data */}
                  <div className="bg-black/30 rounded-xl border border-gray-700 p-4">
                    <h3 className="font-bold mb-3 text-gray-300">📝 Sample Data</h3>
                    {currentChallenge.tables.map(tableName => {
                      const ds = publicDatasets[currentChallenge.dataset];
                      const table = ds?.tables[tableName];
                      if (!table) return null;
                      return (
                        <div key={tableName} className="mb-4">
                          <p className="text-xs font-mono text-gray-400 mb-2">{tableName} (first 3 rows)</p>
                          <div className="overflow-auto">
                            <table className="min-w-full text-xs border border-gray-700">
                              <thead className="bg-gray-800">
                                <tr>{table.columns.slice(0, 5).map((c, i) => <th key={i} className="px-1.5 py-1 text-left font-medium text-gray-400 border-b border-gray-700">{c}</th>)}</tr>
                              </thead>
                              <tbody>
                                {table.data.slice(0, 3).map((row, i) => (
                                  <tr key={i}>
                                    {row.slice(0, 5).map((cell, j) => <td key={j} className="px-1.5 py-1 border-b border-gray-800 text-gray-400">{cell === null ? 'NULL' : String(cell).slice(0, 15)}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

                {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map(a => { const Icon = a.icon; const unlocked = unlockedAchievements.has(a.id); return (
                <div key={a.id} className={`p-4 rounded-xl border ${unlocked ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-gray-800/50 border-gray-700 opacity-60'}`}>
                  <div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${unlocked ? 'bg-yellow-500/30' : 'bg-gray-700'}`}><Icon size={24} className={unlocked ? 'text-yellow-400' : 'text-gray-500'} /></div><div><h3 className="font-bold">{a.name}</h3><p className="text-xs text-gray-400">{a.desc}</p><p className="text-xs text-yellow-400">+{a.xp} XP</p></div></div>
                </div>
              );})}
            </div>
            <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">📊 Your Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-purple-400">{xp}</p><p className="text-sm text-gray-400">Total XP</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-green-400">{queryCount}</p><p className="text-sm text-gray-400">Queries</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-cyan-400">{completedAiLessons.size}/{aiLessons.length}</p><p className="text-sm text-gray-400">AI Lessons</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-orange-400">{solvedChallenges.size}/{challenges.length}</p><p className="text-sm text-gray-400">Challenges</p></div>
                <div className="bg-gray-800/50 p-4 rounded-lg text-center"><p className="text-3xl font-bold text-yellow-400">{unlockedAchievements.size}/{achievements.length}</p><p className="text-sm text-gray-400">Achievements</p></div>
              </div>
            </div>
            
            {/* Challenge Progress */}
            <div className="bg-black/30 rounded-xl border border-orange-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">⚔️ Challenge Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-medium">Easy</span>
                    <span className="text-green-400">{challenges.filter(c => c.difficulty === 'Easy' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Easy').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Easy' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Easy').length) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-medium">Medium</span>
                    <span className="text-yellow-400">{challenges.filter(c => c.difficulty === 'Medium' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Medium').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Medium' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Medium').length) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-medium">Hard</span>
                    <span className="text-red-400">{challenges.filter(c => c.difficulty === 'Hard' && solvedChallenges.has(c.id)).length}/{challenges.filter(c => c.difficulty === 'Hard').length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(challenges.filter(c => c.difficulty === 'Hard' && solvedChallenges.has(c.id)).length / challenges.filter(c => c.difficulty === 'Hard').length) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Tutor Progress */}
            <div className="bg-black/30 rounded-xl border border-cyan-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">🤖 AI Tutor Progress</h2>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Lessons Completed</span>
                <span className="text-cyan-400 font-bold">{completedAiLessons.size}/{aiLessons.length}</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                  style={{ width: `${(completedAiLessons.size / aiLessons.length) * 100}%` }} 
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {aiLessons.map(lesson => (
                  <div 
                    key={lesson.id} 
                    className={`p-2 rounded-lg text-center text-xs ${
                      completedAiLessons.has(lesson.id) 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-gray-800/50 border border-gray-700'
                    }`}
                  >
                    <span className={completedAiLessons.has(lesson.id) ? 'text-green-400' : 'text-gray-500'}>
                      {completedAiLessons.has(lesson.id) ? '✓' : ''} L{lesson.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black/30 rounded-xl border border-blue-500/30 p-6">
              <h2 className="text-xl font-bold mb-4">📦 Dataset Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(publicDatasets).map(([k, ds]) => { const Icon = ds.icon; const rows = Object.values(ds.tables).reduce((a,t) => a + t.data.length, 0); return (
                  <div key={k} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2"><Icon size={20} className="text-purple-400" /><h3 className="font-bold">{ds.name}</h3></div>
                    <p className="text-sm text-gray-400 mb-2">{ds.description}</p>
                    <p className="text-xs text-gray-500">{Object.keys(ds.tables).length} table(s) • {rows} rows</p>
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-black/30 rounded-xl border border-yellow-500/30 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Crown className="text-yellow-400" /> Global Leaderboard</h2>
                <button onClick={() => loadLeaderboard().then(setLeaderboard)} className="text-sm text-purple-400 hover:text-purple-300">↻ Refresh</button>
              </div>
              
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 20).map((entry, i) => {
                    const isCurrentUser = entry.username === currentUser;
                    const rankColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500';
                    const RankIcon = i === 0 ? Crown : i === 1 ? Medal : i === 2 ? Award : null;
                    return (
                      <div key={entry.username} className={`flex items-center gap-4 p-4 rounded-xl ${isCurrentUser ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50'}`}>
                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${rankColor}`}>
                          {RankIcon ? <RankIcon size={24} /> : `#${i + 1}`}
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold">
                          {entry.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{entry.username} {isCurrentUser && <span className="text-purple-400 text-sm">(You)</span>}</p>
                          <p className="text-xs text-gray-400">{entry.solvedCount} challenges solved</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-400">{entry.xp} XP</p>
                          <p className="text-xs text-gray-500">{levels.reduce((acc, l) => entry.xp >= l.minXP ? l : acc, levels[0]).name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Crown className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400">No players yet. Be the first!</p>
                </div>
              )}
            </div>
            
            {/* Your Rank Card */}
            {currentUser && (
              <div className="bg-black/30 rounded-xl border border-purple-500/30 p-6">
                <h3 className="font-bold mb-4">📊 Your Standing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-400">#{leaderboard.findIndex(e => e.username === currentUser) + 1 || '-'}</p>
                    <p className="text-sm text-gray-400">Global Rank</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-400">{xp}</p>
                    <p className="text-sm text-gray-400">Total XP</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-400">{solvedChallenges.size}</p>
                    <p className="text-sm text-gray-400">Challenges</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-400">{queryCount}</p>
                    <p className="text-sm text-gray-400">Total Queries</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
