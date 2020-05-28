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
const formAppointmentSearch = document.getElementById('formAppointmentSearch');
const onSubmitAppointmentSearch = event => {
	formHandlerAppointmentSearch();
	return false;
};
formAppointmentSearch.onsubmit = onSubmitAppointmentSearch;

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
		if (event.target.classList.contains('patientButton')) {
			const element = event.target;
			const id = element.dataset.id;
			listItemHandler(id);
		}
	},
	false
);

//Connect to the appropriate server after the FHIR server redirects
FHIR.oauth2
	.ready()
	.then(fhirClientData => {
		// tapping into hard-coded oauth scope is a hackaround to preserve state on page refresh; we are using it for demo purposes only. 
		// The multiple-connections-in-one-window is not a supported case of the fhir-client library.
		if (fhirClientData.state.scope.includes('Appointment.read')) 
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
		scope: `${fireServerUrl}/user.read openid profile ${fireServerUrl}/Patient.read ${fireServerUrl}/Appointment.read`,
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
		scope: `${fireServerUrl}/user.read openid profile ${fireServerUrl}/Task.write ${fireServerUrl}/Patient.write`,
		redirectUri: 'http://localhost:5000/'
	};
	FHIR.oauth2.authorize(settings);
};


//Query the FHIR server when a search is made
const formHandlerAppointmentSearch = () => {

	const startDate = document.getElementById('startDate').innerHTML;
	const endDate = document.getElementById('endDate').innerHTML;

	const dateSearchString = 'Appointment?date=>=' + startDate + '&date=<=' + endDate;

	//const patientName = document.getElementById('patient').value;
	FHIR.oauth2
		.ready()
		.then(client => client.request(dateSearchString))
		.then(response => {
			if (response && response.entry) {
				const resultsDom = getSearchResultsDom(response);
				const patientListDom = getPatientButtonList(response);
				setSearchResults(resultsDom);
				setPatientResults(patientListDom)
				console.log(response.entry);
			} else {
			}
		});
};

document.getElementById('loadFromCookies').onclick = function() {
	console.log('load cookies was clicked');
	let savedPatient = getPatientDataFromCookie();
	console.log(`tried to load patient: ${savedPatient} from cookies...`);
	document.getElementById('loadedPatients').innerHTML = `<p>${savedPatient}</p>`;
} 

document.getElementById('eraseFromCookies').onclick = function() {
	let savedPatient = eraseCookie('patient');
} 

//Submit the found patient to the FHIR pit representing the screening app
const formHandlerPatientSubmit = () => {
	patientElement = document.getElementById('loadedPatients').innerHTML;
	patientElementWithoutTags=patientElement.slice(3, -4); // remove <p></p>
	sendPatientToConnectathonPit(patientElementWithoutTags);
};


//Generate the HTML for the search results
const getSearchResultsDom = results => {
	const AppointmentList = results.entry.reduce((AppointmentList, AppointmentResult) => {
		
		const AppointmentId = AppointmentResult.resource.id;
		const AppointmentStart = AppointmentResult.resource.start;
		const AppointmentEnd = AppointmentResult.resource.end;
		const PatientId = AppointmentResult.resource.participant[1].actor.reference;
		return AppointmentList + `<li><button data-id="${AppointmentId}" patient-id="${PatientId}" class='button'>${AppointmentStart},${AppointmentEnd}</button></li>`;
	}, '');
	return `<ul>${AppointmentList}</ul>`;
};

const getPatientButtonList = results => {
	const PatientList = results.entry.reduce((PatientList, AppointmentResult) => {
		const PatientId = AppointmentResult.resource.participant[1].actor.reference; 
		const PatientName = AppointmentResult.resource.participant[1].actor.display;
		return PatientList + `<li><button data-id="${PatientId}" class='button patientButton'>${PatientId} - ${PatientName}</button></li>`;
	}, '');
	return `<ul>${PatientList}</ul>`;
}

//Apply insert search results into page
const setSearchResults = resultsDom => {
	const serchResults = document.getElementById('searchResultsList');
	serchResults.innerHTML = resultsDom;
};

const setPatientResults = resultsDom => {
	const serchResults = document.getElementById('patientsFromAppointmentsList');
	serchResults.innerHTML = resultsDom;
};

//Get results from FHIR server
const listItemHandler = id => {
	const patientSearchString = 'Patient?_id=' + id;
	let patientResults = ''

	FHIR.oauth2
		.ready()
		.then(client => client.request(patientSearchString))
		.then(response => {
			if (response && response.entry) {
				patientResults = response;
				console.log(response.entry[0]);
				// storing patient data in a cookie is not recommended, and is done for demo purposes only.
				setCookie('patient', JSON.stringify(patientResults), 100);
			} else {
			}
		});
};

const sendPatientToConnectathonPit = patient => {
		console.log(`attempting to send patient: ${patient} to ConnectathonApplication pit`);
		FHIR.oauth2
			.ready()
			.then(client => client.request({
				url: "Patient/",
				method: "POST",
				body: patient
				//TODO: The FHIR client library does not properly set content headers 
				// for resource creation. As a result, a workaround is required beyond
				// this point.
			}))
			.then(response => {
					console.log(response);
			});

		console.log('sent: ' + patient + ' to write URL');
}

// This is a workaround to accomodate the single-connection-per-window limitation of the 
// FHIR client library. 
function getPatientDataFromCookie() {
	var patient = getCookie("patient");
	return patient;
}