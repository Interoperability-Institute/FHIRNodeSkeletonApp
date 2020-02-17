//Step 1: Connect form handler for connecting to FHIR Service
const formConnect = document.getElementById('formConnect');
const onsubmitConnect = event => {
	formHandlerConnect();
	return false;
};
formConnect.onsubmit = onsubmitConnect;

//Step 2: Patient search form handler
const formPatientSearch = document.getElementById('formPatientSearch');
const onSubmitPatientSearch = event => {
	formHandlerPatientSearch();
	return false;
};
formPatientSearch.onsubmit = onSubmitPatientSearch;

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

//Connect to server after the FHIR server redirects
FHIR.oauth2
	.ready()
	.then(fhirClientData => {
		const fhirServerUrlField = document.getElementById('fhirServerUrl');
		const clientIdField = document.getElementById('clientID');
		const toast = document.getElementById('toast');
		fhirServerUrlField.value = fhirClientData.state.serverUrl.replace('fhir/', '');
		clientIdField.value = fhirClientData.state.clientId;
		toast.innerHTML = 'You have successfully connected and now can search.';
		toast.classList.add('toast');
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
		scope: `${fireServerUrl}/user.read openid profile ${fireServerUrl}/patient.read`,
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
			} else {
			}
		});
};

//Generate HTML for detail view
const getDetailResultDom = patientData => {
	const patientNameData = patientData.name[0];
	const formattedName = getFormattedName(patientNameData);
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
