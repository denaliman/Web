/*global todomvc, angular, Firebase */
'use strict';

/**
* The questionFilter
* Show the new questions on the top and show only max questions 
*
*/
todomvc.filter('questionFilter', function () {
  return function (input, max) {
    var sorted = [];
    var newQuestions = [];
    var sortedCount = 0;

    angular.forEach(input, function (todo) {
	  // create list with the new questions
      if (todo.timestamp > new Date().getTime() - 180000) { // 3min
        todo.new = true;
        newQuestions.push(todo);
	  // creates list for remaining questions
      } else if (sortedCount++<=max){ 
        todo.new = false;
        sorted.push(todo);
      }

      // sort the list of new questions based on the time if echo is the same.
      // Newer ones are on the top
      newQuestions.sort(function(a, b) {
        if (a.echo == b.echo) {
          return b.timestamp - a.timestamp;
        }
        return b.echo - a.echo;
      });
    });

    // Combine the two lists
    return newQuestions.concat(sorted);
  };
});
