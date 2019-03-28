﻿var resultOffset = 0;
var monitorResultOffset = 0;

$('#AnalyzeLink').addClass('active');

var ScanTypeGroup = $('input[type=radio][name=ScanType]');
$('.results').hide();

ScanTypeGroup.change(function () {
    $('.scan').toggle(ScanTypeGroup.filter(':checked').val() === 'Static');
    $('.monitor').toggle(ScanTypeGroup.filter(':checked').val() === 'Live');
    ResetResults();
}).change();

$("#SelectedMonitorRunId").change(function () {
    monitorResultOffset = 0;
    GetMonitorResults($('input[name=MonitorResultType]:checked').val(), monitorResultOffset, 100);
});

$("#DirectorySelector").change(function () {
    $("#DirectoryPath").val($('#DirectorySelector')[0].files[0].path);
});

$("#DirectorySelectorMonitor").change(function () {
    $("#DirectoryPathMonitor").val($('#DirectorySelectorMonitor')[0].files[0].path);
});

var ResultTypeGroup = $('input[type=radio][name=ResultType]');

ResultTypeGroup.change(function () {
    $('.results').hide();
    resultOffset = 0;
    $("#ExportResultsButton").attr('disabled', false);
    GetResults($('input[name=ResultType]:checked').val(), resultOffset, 100);
    switch (parseInt(ResultTypeGroup.filter(':checked').val())){
        case RESULT_TYPE.PORT:
            $('.ports').show();
            break;
        case RESULT_TYPE.USER:
            $('.users').show();
            break;
        case RESULT_TYPE.FILE:
            $('.files').show();
            break;
        case RESULT_TYPE.CERTIFICATE:
            $('.certificates').show();
            break;
        case RESULT_TYPE.SERVICES:
            $('.services').show();
            break;
        case RESULT_TYPE.REGISTRY:
            $('.registry').show();
            break;
    }
});

$('#SelectedBaseRunId').change(function () { ResetResults(); } );
$('#SelectedCompareRunId').change(function () { ResetResults(); } );

$("#RunAnalysisButton").click(function () {
    ResetResults();
    DisableCollectionFields();

    appendDebugMessage("Button Clicked",false);
    if($("#SelectedBaseRunId").value == "" || $("#SelectedCompareRunId").val() == "")
    {
        SetStatus("Must select runs.");
        EnableCollectionFields();
    }
    else if ($("#SelectedBaseRunId").val() == $("#SelectedCompareRunId").val())
    {
        SetStatus("Must select different runs.");
        EnableCollectionFields();
    }
    else
    {
        var compare = { 'first_id': $('#SelectedBaseRunId').val(), 'second_id': $('#SelectedCompareRunId').val() };
        $.getJSON('RunAnalysis', compare, function (result) {
            SetStatus(result);
        });

        setTimeout(GetComparators, 500);
    }
});

$("#FetchResultsButton").click(function () {
    resultOffset = resultOffset + 100;
    GetResults($('input[name=ResultType]:checked').val(), resultOffset, 100);
});

$("#RunMonitorAnalysisButton").click(function () {
    monitorResultOffset = monitorResultOffset + 100;
    GetMonitorResults($('input[name=MonitorResultType]:checked').val(), monitorResultOffset, 100);
});

$('#ExportResultsButton').click(ExportToExcel);
$('#ExportMonitorResults').click(ExportMonitorResults);

function ResetResults() {
    $('.results').hide();
    $('input[name=ResultType]').prop('checked', false);
    $('input[name=ResultType]').prop('disabled', true);
    $('tbody').empty();
    $('#CountStatus').empty();
    $('#CompareStatus').empty();
    $('.ResultManipulationButton').prop('disabled', true);
}

function SetStatus(status) {
    $('#Status').empty();
    $('#Status').append(status);
}

function SetMonitorStatus(status) {
    $('#MonitorStatus').empty();
    $('#MonitorStatus').append(status);
}

function GetComparators() {
    $.getJSON('GetComparators', function (result) {
        data = JSON.parse(result);
        keepChecking = false;
        $('#CompareStatus').empty();
        $.each(data, function (key, value) {
            if (value === RUN_STATUS.RUNNING) {
                keepChecking = true;
                icon = '<i class="fas fa-cog fa-spin"></i>  ';
            }
            else if (value === RUN_STATUS.COMPLETED) {
                icon = '<i class="far fa-check-circle" style="color:green"></i>  ';
            }
            else if (value === RUN_STATUS.NOT_STARTED) {
                icon = '<i class="fas fa-pause"></i>  ';
            }
            else if (value === RUN_STATUS.NO_RESULTS) {
                icon = '<i class="fas fa-level-down-alt"></i>  ';
            }
            else {
                icon = '<i class="fas fa-exclamation-triangle"></i>  ';
            }
            $('#CompareStatus').append($('<div/>', { html: icon + key + ' is ' + runStatusToString(value), class: 'scan' }));
        });
        if (keepChecking) {
            DisableCollectionFields();
            setTimeout(GetComparators, 500);
        }
        else {
            EnableCollectionFields();
            GetResultTypes();
        }
    });
}

function DisableCollectionFields() {
    $("#RunAnalysisButton").prop("disabled", true);
    $('#SelectedBaseRunId').prop('disabled', true);
    $('#SelectedCompareRunId').prop('disabled', true);
    $('#SelectedResultId').prop('disabled', true);
    $(".ScanType").prop('disabled', true);
    $('input[name=ExportQuantity]').prop('disabled', true);
}

function EnableCollectionFields() {
    $("#RunAnalysisButton").prop("disabled", false);
    $('#SelectedBaseRunId').prop('disabled', false);
    $('#SelectedCompareRunId').prop('disabled', false);
    $('#SelectedResultId').prop('disabled', false);
    $(".ScanType").prop('disabled', false);
}

function GetResultTypes() {
    data = { 'BaseId': $('#SelectedBaseRunId').val(), 'CompareId': $('#SelectedCompareRunId').val() };

    $.getJSON('GetResultTypes', data, function (result) {
        if ((result.File || result.Port || result.Certificate || result.Service || result.Registry || result.User) == false) {
            SetStatus("The two runs selected have no common collectors.");
        } else {
            $('input[name=ExportQuantity]').prop('disabled', false);
        }
        $('#FileRadio').attr('disabled', (result.File) ? false : true);
        $('#PortRadio').attr('disabled', (result.Port) ? false : true);
        $('#CertificateRadio').attr('disabled', (result.Certificate) ? false : true);
        $('#ServiceRadio').attr('disabled', (result.Service) ? false : true);
        $('#RegistryRadio').attr('disabled', (result.Registry) ? false : true);
        $('#UserRadio').attr('disabled', (result.User) ? false : true);
    });
}

function UpdateNumResults(total, offset, requested, actual) {
    $('#CountStatus').empty();
    $("#CountStatus").append("Showing " + (offset + 1) + " to " + (offset + actual) + " results. " + total + " total records.");
}

function UpdateMonitorNumResults(total, offset, requested, actual) {
    $('#MonitorCountStatus').empty();
    $("#MonitorCountStatus").append("Showing " + (offset + 1) + " to " + (offset + actual) + " results. " + total + " total records.");
}

function GetResults(type, offset, number) {
    data = { 'BaseId': $('#SelectedBaseRunId').val(), 'CompareId': $('#SelectedCompareRunId').val(), 'ResultType': type, 'Offset': offset, 'NumResults': number };
    $.getJSON('GetResults', data, function (results) {
        obj = JSON.parse(results);
        UpdateNumResults(obj.TotalCount, obj.Offset, obj.Requested, obj.Actual);

        // Enable only if we have more results to fetch
        $("#FetchResultsButton").attr('disabled', (obj.TotalCount <= obj.Offset + obj.Actual));

        objs = obj.Results;
        $('tbody').empty();
        for (i = 0; i < objs.length; i++)
        {
            InsertIntoTable(objs[i]);
        }
        $('.resultTableRow').click(function () {
            $('#' + this.id + "_expanded").slideToggle();
            var arrow = $('#' + this.id + '_expansion_arrow');
            if (arrow.hasClass('fa-caret-right')) {
                arrow.removeClass('fa-caret-right');
                arrow.addClass('fa-caret-down');
            }
            else {
                arrow.removeClass('fa-caret-down');
                arrow.addClass('fa-caret-right');
            }
        });
        $('.resultTableExpanded').click(function () {
            $('#'+this.id).slideToggle();
        });
    });
}

function GetMonitorResults(type, offset, number) {
    data = { 'RunId': $('#SelectedMonitorRunId').val(), 'ResultType': type, 'Offset': offset, 'NumResults': number };
    $.getJSON('GetMonitorResults', data, function (results) {
        obj = JSON.parse(results);
        UpdateMonitorNumResults(obj.TotalCount, obj.Offset, obj.Requested, obj.Actual);

        // Disable the button if we have no more results
        $("#RunMonitorAnalysisButton").attr('disabled', (obj.TotalCount <= obj.Offset + obj.Actual));
        $("#ExportMonitorResults").prop('disabled', false);

        objs = obj.Results;
        $('tbody').empty();
        for (i = 0; i < objs.length; i++)
        {
            InsertIntoMonitorTable(objs[i]);
        }
    });
}

function ChangeTypeToString(change_type) {
    switch (change_type) {
        case CHANGE_TYPE.DELETED:
            return "Deleted";
        case CHANGE_TYPE.CREATED:
            return "Created";
        case CHANGE_TYPE.MODIFIED:
            return "Modified";
        case CHANGE_TYPE.RENAMED:
            return "Renamed";
        default:
            return "Invalid change type";
    }
}

function InsertIntoMonitorTable(result) {
    tmp = $('<tr/>');
    tmp.append($('<td/>', {
        scope: "col",
        html: ChangeTypeToString(result.ChangeType)
    }));
    tmp.append($('<td/>', {
        scope: "col",
        html: result.Path
    }));
    tmp.append($('<td/>', {
        scope: "col",
        html: result.OldPath
    }));
    tmp.append($('<td/>', {
        scope: "col",
        html: result.Name
    }));
    tmp.append($('<td/>', {
        scope: "col",
        html: result.OldName
    }));
    $('#FileMonitorResultsTableBody').append(tmp);
}

function ExportToExcel() {
    data = {
        'BaseId': $('#SelectedBaseRunId').val(),
        'CompareId': $('#SelectedCompareRunId').val(),
        'ResultType': $('input[name=ResultType]:checked').val(),
        'ExportAll': ($('input[name=ExportQuantity]:checked').val() == 1),
        'OutputPath': ($('#DirectoryPath').val() == "") ? $('#DirectoryPath').attr('placeholder') : $('#DirectoryPath').val()
    };
    $.getJSON('WriteScanJson', data, function (results) {
        SetStatus("Results Written");
    });
}

function ExportMonitorResults() {
    data = {
        'RunId': $('#SelectedMonitorRunId').val(),
        'ResultType': $('input[name=MonitorResultType]:checked').val(),
        'OutputPath': ($('#DirectoryPathMonitor').val() == "") ? $('#DirectoryPathMonitor').attr('placeholder') : $('#DirectoryPathMonitor').val()
 };
    $.getJSON('WriteMonitorJson', data, function (results) {
        SetMonitorStatus("Results written");
    });
}

function InsertIntoTable(result) {
    result.SerializedBase = JSON.parse(result.SerializedBase);
    result.SerializedCompare = JSON.parse(result.SerializedCompare);
    switch (parseInt(result.ResultType)) {
        case RESULT_TYPE.PORT:
            InsertIntoPortTable(result);
            break;
        case RESULT_TYPE.FILE:
            InsertIntoFileTable(result);
            break;
        case RESULT_TYPE.CERTIFICATE:
            InsertIntoCertificateTable(result);
            break;
        case RESULT_TYPE.SERVICES:
            InsertIntoServiceTable(result);
            break;
        case RESULT_TYPE.USER:
            InsertIntoUserTable(result);
            break;
        case RESULT_TYPE.REGISTRY:
            InsertIntoRegistryTable(result);
            break;
    }
}

function InsertIntoRegistryTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Path
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Value
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Contents
        }));
        $('#RegistryResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Path
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Value
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.DisplayName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Contents
        }));
        $('#RegistryResultsTableBody').append(tmp);
    }
}

function InsertIntoServiceTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.ServiceName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.StartType
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.DisplayName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.CurrentState
        }));
        $('#ServiceResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.ServiceName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.StartType
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.DisplayName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.CurrentState
        }));
        $('#ServiceResultsTableBody').append(tmp);
    }
}

function InsertIntoCertificateTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.StoreLocation
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.StoreName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Subject
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.CertificateHashString
        }));
        $('#CertificateResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.StoreLocation
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.StoreName
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Subject
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.CertificateHashString
        }));
        $('#CertificateResultsTableBody').append(tmp);
    }
}

function InsertIntoUserTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        var uid = uuidv4();
        tmp = $('<tr/>', {
            id: uid,
            class: 'resultTableRow Info',
        });
        var arrowTD = $('<td/>', {
            scope: 'col',
        });
        var caretContainer = ($('<div/>'));
        var caret = $('<i/>', {
            class: "fas fa-caret-right",
            id: uid + '_expansion_arrow'
        });
        caretContainer.append(caret);
        arrowTD.append(caretContainer);
        tmp.append(arrowTD);
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.AccountType
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Name
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Description
        }));
        $('#UserResultsTableBody').append(tmp);

        tmp = $('<tr/>');
        tmp2 = $('<td/>', {
            colspan: 5,
            class: 'resultTableExpanded',
            id: uid + '_expanded'
        });
        tmpDiv = $('<div/>', {
            class: 'card card-body'
        });
        for (var prop in result.SerializedBase) {
            if (result.SerializedBase.hasOwnProperty(prop)) {
                tmp3 = $('<tr/>');
                tmp4 = $('<td/>', { html: prop });
                tmp5 = $('<td/>', { html: result.SerializedBase.prop });
                tmp3.append(tmp4);
                tmp3.append(tmp5);
                tmpDiv.append(tmp3);
            }
        }
        tmp2.append(tmpDiv);
        tmp.append(tmp2);
        $('#PortResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        var uid = uuidv4();
        tmp = $('<tr/>', {
            id: uid,
            class: 'resultTableRow Info',
        });
        var arrowTD = $('<td/>', {
            scope: 'col',
        });
        var caretContainer = ($('<div/>'));
        var caret = $('<i/>', {
            class: "fas fa-caret-right",
            id: uid + '_expansion_arrow'
        });
        caretContainer.append(caret);
        arrowTD.append(caretContainer);
        tmp.append(arrowTD);
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.AccountType
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Name
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Description
        }));
        $('#UserResultsTableBody').append(tmp);

        tmp = $('<tr/>');
        tmp2 = $('<td/>', {
            colspan: 5,
            class: 'resultTableExpanded',
            id: uid + '_expanded'
        });
        tmp2.append($('<div/>', {
            html: 'Home Directory: ' + result.SerializedCompare.HomeDirectory,
            class: 'card card-body'
        }));
        tmp.append(tmp2);
        $('#PortResultsTableBody').append(tmp);
    }
}

function InsertIntoFileTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Path
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Permissions
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.Size
        }));
        $('#FileResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        tmp = $('<tr/>');
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Path
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Permissions
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.Size
        }));
        $('#FileResultsTableBody').append(tmp);
    }
}

function InsertIntoPortTable(result) {
    if (result.ChangeType != CHANGE_TYPE.CREATED) {
        var uid = uuidv4();
        tmp = $('<tr/>', {
            id: uid,
            class: 'resultTableRow'
        });
        var arrowTD = $('<td/>', {
            scope: 'col',
        });
        var caretContainer = ($('<div/>'));
        var caret = $('<i/>', {
            class: "fas fa-caret-right",
            id: uid + '_expansion_arrow'
        });
        caretContainer.append(caret);
        arrowTD.append(caretContainer);
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.port
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.type
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedBase.address
        }));
        $('#PortResultsTableBody').append(tmp);

        tmp = $('<tr/>');
        tmp2 = $('<td/>', {
            colspan: 5,
            class: 'resultTableExpanded',
            id: uid + '_expanded'
        });
        tmp2.append($('<div/>', {
            html: 'Process Name: ' + result.SerializedBase.processName,
            class: 'card card-body'
        }));
        tmp.append(tmp2);
        $('#PortResultsTableBody').append(tmp);
    }
    if (result.ChangeType != CHANGE_TYPE.DELETED) {
        var uid = uuidv4();
        tmp = $('<tr/>', {
            id: uid,
            class: 'resultTableRow Info',
        });
        var arrowTD = $('<td/>', {
            scope: 'col',
        });
        var caretContainer = ($('<div/>'));
        var caret = $('<i/>', {
            class: "fas fa-caret-right",
            id: uid + '_expansion_arrow'
        });
        caretContainer.append(caret);
        arrowTD.append(caretContainer);
        tmp.append(arrowTD);
        tmp.append($('<td/>', {
            scope: "col",
            html: ChangeTypeToString(result.ChangeType)
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.port
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.type
        }));
        tmp.append($('<td/>', {
            scope: "col",
            html: result.SerializedCompare.address
        }));
        $('#PortResultsTableBody').append(tmp);

        tmp = $('<tr/>');
        tmp2 = $('<td/>', {
            colspan: 5,
            class: 'resultTableExpanded',
            id: uid + '_expanded'
        });
        tmp2.append($('<div/>', {
            html: 'Process Name: ' + result.SerializedCompare.processName,
            class: 'card card-body'
        }));
        tmp.append(tmp2);
        $('#PortResultsTableBody').append(tmp);
    }
}