/*global todomvc, angular, Firebase */
'use strict';

/**
* The main controller for the app. The controller:
* - retrieves and persists the model via the $firebaseArray service
* - exposes the model to the template and provides event handlers
*/
todomvc.controller('TodoCtrl',
['$scope', '$location', '$firebaseArray', '$sce', '$localStorage', '$window',
function ($scope, $location, $firebaseArray, $sce, $localStorage, $window) {
	// set local storage
	$scope.$storage = $localStorage;

	// set max number of questions
	var scrollCountDelta = 10;
	$scope.maxQuestion = scrollCountDelta;
	$scope.maxReply = 2;

	/*
	$(window).scroll(function(){
	if($(window).scrollTop() > 0) {
	$("#btn_top").show();
} else {
$("#btn_top").hide();
}
});
*/
var splits = $location.path().trim().split("/");
var roomId = angular.lowercase(splits[1]);
if (!roomId || roomId.length === 0) {
	roomId = "all";
}

// TODO: Please change this URL for your app
var firebaseURL = "https://cmkquestionsdb.firebaseio.com/";


// create variables for firebase DB
$scope.roomId = roomId;
var url = firebaseURL + roomId + "/questions/";
var urlReplies = firebaseURL + roomId + "/replies/";
var echoRef = new Firebase(url);
var echoRefReplies = new Firebase(urlReplies);

var query = echoRef.orderByChild("order");
var queryReplies = echoRefReplies.orderByChild("order");

// Should we limit?
//.limitToFirst(1000);
$scope.todos = $firebaseArray(query);
$scope.todosReplies = $firebaseArray(queryReplies);

//$scope.input.wholeMsg = '';
$scope.editedTodo = null;


// pre-processing for collection - Questions
$scope.$watchCollection('todos', function () {
	var total = 0;
	var remaining = 0;
	$scope.todos.forEach(function (todo) {
		// Skip invalid entries so they don't break the entire app.
		if (!todo || !todo.head ) {
			return;
		}
		
		total++;
		if (todo.completed === false) {
			remaining++;
		}

		// set time
		todo.dateString = new Date(todo.timestamp).toString();
		todo.tags = todo.wholeMsg.match(/#\w+/g);

		todo.trustedDesc = $sce.trustAsHtml($scope.XssProtection(todo.linkedDesc));
		
	});

	$scope.totalCount = total;
	$scope.remainingCount = remaining;
	$scope.completedCount = total - remaining;
	$scope.allChecked = remaining === 0;
	$scope.absurl = $location.absUrl();
}, true);

// pre-processing for collection - Replies
$scope.$watchCollection('todosReplies', function () {
	var total = 0;
	var remaining = 0;
	$scope.todosReplies.forEach(function (reply) {
		// Skip invalid entries so they don't break the entire app.
		//if (!reply || !reply.head ) {
		//	return;
		//}

		total++;
		if (reply.completed === false) {
			remaining++;
		}

		// set time
		reply.dateString = new Date(reply.timestamp).toString();
		reply.tags = reply.wholeMsg.match(/#\w+/g);

		reply.trustedDesc = $sce.trustAsHtml($scope.XssProtection(reply.linkedDesc));
		
	});

	//$scope.totalCount = total;
	//$scope.remainingCount = remaining;
	//$scope.completedCount = total - remaining;
	//$scope.allChecked = remaining === 0;
	//$scope.absurl = $location.absUrl();
}, true);


// Get the first sentence and rest
$scope.getFirstAndRestSentence = function($string) {
	var head = $string;
	var desc = "";

	var separators = [". ", "? ", "! ", '\n'];

	var firstIndex = -1;
	for (var i in separators) {
		var index = $string.indexOf(separators[i]);
		if (index == -1) continue;
		if (firstIndex == -1) {firstIndex = index; continue;}
		if (firstIndex > index) {firstIndex = index;}
	}

	if (firstIndex !=-1) {
		head = $string.slice(0, firstIndex+1);
		desc = $string.slice(firstIndex+1);
	}
	return [head, desc];
};

// Post question
$scope.addTodo = function () {
	var newTodo = $scope.input.wholeMsg.trim();

	// No input, so just do nothing
	if (!newTodo.length) {
		return;
	}

	var firstAndLast = $scope.getFirstAndRestSentence(newTodo);
	var head = firstAndLast[0];
	var desc = $scope.XssProtection(firstAndLast[1]);

	$scope.todos.$add({
		wholeMsg: newTodo,
		wholeMsgReply: '',
		head: head,
		headLastChar: head.slice(-1),
		desc: desc,
		linkedDesc: Autolinker.link(desc, {newWindow: false, stripPrefix: false}),
		completed: false,
		timestamp: new Date().getTime(),
		tags: "...",
		echo: 0,
		order: 0,
		replies: 0
	});
	// remove the posted question in the input
	$scope.input.wholeMsg = '';
};


// Reply to Question
$scope.replyTodo = function (todo) {
	
	var newTodo = todo.wholeMsgReply.trim();
	
	// No input, so just do nothing
	if (!newTodo.length) {
		return;
	}
	
	$scope.editedTodo = todo;
	todo.replies = todo.replies + 1;
	$scope.todos.$save(todo);
	
	var firstAndLast = $scope.getFirstAndRestSentence(newTodo);
	var head = firstAndLast[0];
	var desc = $scope.XssProtection(firstAndLast[1]);
	
	$scope.todosReplies.$add({
		wholeMsg: newTodo,
		wholeMsgReply: '',
		head: head,
		headLastChar: head.slice(-1),
		desc: desc,
		linkedDesc: Autolinker.link(desc, {newWindow: false, stripPrefix: false}),
		completed: false,
		timestamp: new Date().getTime(),
		tags: "...",
		echo: 0,
		order: 0,
		parentID: todo.$id,
		replies: 0
	});
	// remove the posted question in the input
	todo.wholeMsgReply = '';
	$scope.todos.$save(todo);
	
};



$scope.editTodo = function (todo) {
	$scope.editedTodo = todo;
	$scope.originalTodo = angular.extend({}, $scope.editedTodo);
};

$scope.upEcho = function (todo) {
	$scope.editedTodo = todo;
	todo.echo = todo.echo + 1;
	// Hack to order using this order.
	todo.order = todo.order -1;
	$scope.todos.$save(todo);

	// Disable the button
	$scope.$storage[todo.$id] = "echoed";
};

$scope.downEcho = function (todo) {
	$scope.editedTodo = todo;
	todo.echo = todo.echo - 1;
	// Hack to order using this order.
	todo.order = todo.order +1;
	$scope.todos.$save(todo);

	// Disable the button
	$scope.$storage[todo.$id] = "echoed";
};

$scope.doneEditing = function (todo) {
	$scope.editedTodo = null;
	var wholeMsg = todo.wholeMsg.trim();
	if (wholeMsg) {
		$scope.todos.$save(todo);
	} else {
		$scope.removeTodo(todo);
	}
};

$scope.revertEditing = function (todo) {
	todo.wholeMsg = $scope.originalTodo.wholeMsg;
	$scope.doneEditing(todo);
};

$scope.removeTodo = function (todo) {
	$scope.todos.$remove(todo);
};

$scope.clearCompletedTodos = function () {
	$scope.todos.forEach(function (todo) {
		if (todo.completed) {
			$scope.removeTodo(todo);
		}
	});
};

$scope.toggleCompleted = function (todo) {
	todo.completed = !todo.completed;
	$scope.todos.$save(todo);
};

$scope.markAll = function (allCompleted) {
	$scope.todos.forEach(function (todo) {
		todo.completed = allCompleted;
		$scope.todos.$save(todo);
	});
};

$scope.FBLogin = function () {
	var ref = new Firebase(firebaseURL);
	ref.authWithOAuthPopup("facebook", function(error, authData) {
		if (error) {
			console.log("Login Failed!", error);
		} else {
			$scope.$apply(function() {
				$scope.$authData = authData;
				$scope.isAdmin = true;
			});
			console.log("Authenticated successfully with payload:", authData);
		}
	});
};

$scope.FBLogout = function () {
	var ref = new Firebase(firebaseURL);
	ref.unauth();
	delete $scope.$authData;
	$scope.isAdmin = false;
};

$scope.increaseMax = function () {
	if ($scope.maxQuestion < $scope.totalCount) {
		$scope.maxQuestion+=scrollCountDelta;
	}
};

$scope.toTop =function toTop() {
	$window.scrollTo(0,0);
};

// Not sure what is this code. Todel
if ($location.path() === '') {
	$location.path('/');
}
$scope.location = $location;

// autoscroll
angular.element($window).bind("scroll", function() {
	if ($window.innerHeight + $window.scrollY >= $window.document.body.offsetHeight) {
		console.log('Hit the bottom2. innerHeight' +
		$window.innerHeight + "scrollY" +
		$window.scrollY + "offsetHeight" + $window.document.body.offsetHeight);

		// update the max value
		$scope.increaseMax();

		// force to update the view (html)
		$scope.$apply();
	}
});

$scope.XssProtection = function($string) {
    //var filteredMsg = "<pre>";
	var filteredMsg = '';
    var inHashtag = false;
    for (var i = 0; i < $string.length; ++i) {
		var ch = $string.charAt(i);
		if (ch == '<') {
	    	filteredMsg+="&lt;";
		} else if (ch == '>') {
	    	filteredMsg+="&gt;";
		} else if (ch == '\"') {
	    	filteredMsg+="&quot;";
		} else if (ch == '#' && !inHashtag) {
	    	inHashtag = true;
	    	filteredMsg+="<strong>"+ch;
		} else if (inHashtag && (ch == ' ' || ch == '\n')) {
	    	inHashtag = false;
	    	filteredMsg+="</strong>"+ch;
		} else {
	    	filteredMsg+=ch;
		}
    }
    //filteredMsg+="</pre>";
    return filteredMsg;
};

}]);
