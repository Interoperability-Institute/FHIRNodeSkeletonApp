//Step 1: Connect form handler for connecting to FHIR Service
const formConnect = document.getElementById('formConnect');
const onsubmitConnect = event => {
	formHandlerConnect();
	return false;
};
formConnect.onsubmit = onsubmitConnect;

const formWriteConnect = document.getElementById('formWriteConnect');
const onsubmitWriteConnect = event => {
	formHandlerWriteConnect();
	return false;
};
formWriteConnect.onsubmit = onsubmitWriteConnect;

//Step 2: Patient search form handler
const formPatientSearch = document.getElementById('formPatientSearch');
const onSubmitPatientSearch = event => {
	formHandlerPatientSearch();
	return false;
};
formPatientSearch.onsubmit = onSubmitPatientSearch;

//Step 5: Submit patient to screening app
const formPatientSubmit = document.getElementById('formPatientSubmit');
const onSubmitPatientSubmit = event => {
	formHandlerPatientSubmit();
	return false;
};
formPatientSubmit.onsubmit = onSubmitPatientSubmit;

//Step 3: Listen to button click in results list
document.addEventListener(
	'click',
	event => {
		if (event.target.className === 'button') {
			const element = event.target;
			const id = element.dataset.id;
			listItemHandler(id);
		}
	},
	false
);

//Connect to the appropriate server after the FHIR server redirects
// TODO: WRITE BETTER CONDITION HERE
FHIR.oauth2
	.ready()
	.then(fhirClientData => {
		// tapping into hard-coded oauth scope is a hackaround to preserve state on page refresh; we are using it for demo purposes only. 
		// The multiple-connections-in-one-window is not a supported case of the fhir-client library.
		if (fhirClientData.state.scope.includes('patient.read')) 
		{
			const fhirServerUrlField = document.getElementById('fhirServerUrl');
			const clientIdField = document.getElementById('clientID');
			fhirServerUrlField.value = fhirClientData.state.serverUrl.replace('fhir/', '');
			clientIdField.value = fhirClientData.state.clientId;
			const toast = document.getElementById('toast');
			toast.classList.add('toast');
			toast.innerHTML = 'You have successfully connected to the READ url and now can search.';
		}
		else if (fhirClientData.state.scope.includes('Task.write'))
		{
			const fhirServerUrlField = document.getElementById('fhirServerWriteUrl');
			const clientIdField = document.getElementById('clientWriteID');
			fhirServerUrlField.value = fhirClientData.state.serverUrl.replace('fhir/', '');
			clientIdField.value = fhirClientData.state.clientId;
			const toast = document.getElementById('toast');
			toast.classList.add('toast');
			toast.innerHTML = 'You have successfully connected to the WRITE url and now can search.';
		}
	})
	.catch(error => {
		console.log('Please connect to a FHIR Server.');
	});


//Handles the form for connecting by authorizing through OAuth2
const formHandlerConnect = () => {
	const fireServerUrl = document.getElementById('fhirServerUrl').value;
	const clientID = document.getElementById('clientID').value;
	const settings = {
		iss: `${fireServerUrl}fhir/`,
		client_id: clientID,
		clientId: clientID,
		// scope: 'patient/*.read user/Patient.read launch openid profile online_access',
		scope: `${fireServerUrl}/user.read openid profile ${fireServerUrl}/patient.read ${fireServerUrl}/appointment.read`,
		redirectUri: 'http://localhost:5000/'
	};
	FHIR.oauth2.authorize(settings);
};

//Handles the form for connecting to the Write by authorizing through OAuth2
const formHandlerWriteConnect = () => {
	const fireServerUrl = document.getElementById('fhirServerWriteUrl').value;
	const clientID = document.getElementById('clientWriteID').value;
	const settings = {
		iss: `${fireServerUrl}fhir/`,
		client_id: clientID,
		clientId: clientID,
		// scope: 'patient/*.read user/Patient.read launch openid profile online_access',
		// adjust scope to include write permissions
		scope: `${fireServerUrl}/user.read openid profile ${fireServerUrl}/Task.write`,
		redirectUri: 'http://localhost:5000/'
	};
	FHIR.oauth2.authorize(settings);
};

//Query the FHIR server when a search is made
const formHandlerPatientSearch = () => {
	const patientName = document.getElementById('patient').value;
	FHIR.oauth2
		.ready()
		.then(client => client.request(`Patient?family=${patientName}`))
		.then(response => {
			if (response && response.entry) {
				const resultsDom = getSearchResultsDom(response);
				setSearchResults(resultsDom);
			} else {
			}
		});
};

//Submit the found patient to the FHIR pit representing the screening app
const formHandlerPatientSubmit = () => {
	const myTask = Tasktemplate
	myTask['for'] = patientResults;
	
	const patientName = patientResults.name[0];
	FHIR.oauth2
		.ready()
		.then(client => client.create(myTask))
		.then(response => {
			if (response) {
				document.getElementById('patientSubmissionResults').innerHTML = response;
			} else {
				document.getElementById('patientSubmissionResults').innerHTML = "no results from submission...";	
			}
		});
};


//Generate the HTML for the search results
const getSearchResultsDom = results => {
	const patientList = results.entry.reduce((patientList, patientResult) => {
		const patientNameData = patientResult.resource.name[0];
		const formattedName = getFormattedName(patientNameData);
		const patientId = patientResult.resource.id;
		return patientList + `<li><button data-id="${patientId}" class='button'>${formattedName}</button></li>`;
	}, '');
	return `<ul>${patientList}</ul>`;
};

//Apply insert search results into page
const setSearchResults = resultsDom => {
	const serchResults = document.getElementById('searchResultsList');
	serchResults.innerHTML = resultsDom;
};

//Takes the FHIR data for a name and converts it to a string
const getFormattedName = patientNameData => {
	const familyName = patientNameData.family;
	const givenName = getGivenName(patientNameData.given);
	return `${givenName}${familyName}`;
};

//Takes an an array of given names and concatenates them into a single string
const getGivenName = givenNameArray => {
	return givenNameArray.reduce((givenNameString, givenNamePart) => {
		return `${givenNameString}${givenNamePart} `;
	}, '');
};

//Get results from FHIR server
const listItemHandler = id => {
	FHIR.oauth2
		.ready()
		.then(client => client.request(`Patient?_id=${id}`))
		.then(response => {
			if (response && response.entry) {
				const resultsDom = getDetailResultDom(response.entry[0].resource);
				setDetailResult(resultsDom);
				setDetailResultJSON(response.entry[0].resource)
			} else {
			}
		});
};

//Generate HTML for detail view
const getDetailResultDom = patientData => {
	const patientNameData = patientData.name[0];
	const formattedName = getFormattedName(patientNameData);
	patientResults = patientData;
	return `
		<h3>Name</h3>
		<p>${formattedName}</p>
		<h3>Birth Date</h3>
		<p>${patientData.birthDate}</p>
		<h3>Gender</h3>
		<p>${patientData.gender}</p>
	`;
};

//Set results in HTML for the detail view
const setDetailResult = resultsDom => {
	const searchResultsItem = document.getElementById('searchResultsItem');
	searchResultsItem.innerHTML = resultsDom;
};

const setDetailResultJSON = results => {
	const searchResultsItemJSON=document.getElementById('searchResultsItemJSON');
	resultsAsJSON = JSON.stringify(results);
	searchResultsItemJSON.innerHTML = `<p>${resultsAsJSON}</p>`;
}


const Tasktemplate = {
		"resourceType": "Task",
		"id": "exampleTask",
		"status": "draft",
		"intent": "proposal",
		"code": {
		  "text": "Send this questionnaire to these patients"
		},
		"focus": {
		  "reference": "Questionnaire/1"
		},
		"for": {
		  "reference": "Patient/f001"
		},
		"authoredOn": "2016-03-10T22:39:32-04:00",
		"lastModified": "2016-03-10T22:39:32-04:00",
		"requester": {
		  "reference": "Practitioner/example"
		},
		"owner": {
		  "reference": "Practitioner/example"
		}
	  }
