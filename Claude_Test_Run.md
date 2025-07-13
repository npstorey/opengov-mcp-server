how many 311 noise complaints were there in brooklyn in June 2025?

Edit

Strategized retrieving NYC noise complaint data for June 2025.
1s


I'll search NYC Open Data for 311 noise complaint data to find information about Brooklyn complaints in June 2025.

favicon

search
Request

{
  `query`: `311 noise complaints Brooklyn 2025`
}
Response

[
  {
    "id": "eabe-havv:catalog",
    "score": 1
  },
  {
    "id": "dntt-gqwq:catalog",
    "score": 0.9
  },
  {
    "id": "5ijn-vbdv:catalog",
    "score": 0.8
  }
]

Hunted for relevant 311 noise complaint datasets.
1s


Let me retrieve the details for these datasets to find the one with 2025 noise complaint data.

favicon

document_retrieval
Request

{
  `ids`: [
    `eabe-havv:catalog`,
    `dntt-gqwq:catalog`,
    `5ijn-vbdv:catalog`
  ]
}
Response

[
  {
    "id": "eabe-havv",
    "name": "DOB Complaints Received",
    "assetType": "dataset",
    "attribution": "Department of Buildings (DOB)",
    "averageRating": 0,
    "category": "Housing & Development",
    "createdAt": 1366298350,
    "description": "This is the universe of complaints received by Department of Buildings (DOB). It includes complaints that come from 311 or that are entered into the system by DOB staff.\r\n\r\nA Complaint Categories codes can be found at\r\nhttp://www1.nyc.gov/assets/buildings/pdf/bis_complaint_disposition_codes.pdf",
    "diciBackend": false,
    "displayType": "table",
    "downloadCount": 51364,
    "hideFromCatalog": false,
    "hideFromDataJson": false,
    "locked": false,
    "newBackend": true,
    "numberOfComments": 12,
    "oid": 40010688,
    "provenance": "official",
    "publicationAppendEnabled": true,
    "publicationDate": 1695931514,
    "publicationGroup": 804330,
    "publicationStage": "published",
    "rowsUpdatedAt": 1752423632,
    "rowsUpdatedBy": "5fuc-pqz2",
    "tableId": 19304586,
    "totalTimesRated": 0,
    "viewCount": 172602,
    "viewLastModified": 1752422411,
    "viewType": "tabular",
    "approvals": [
      {
        "reviewedAt": 1566159030,
        "reviewedAutomatically": true,
        "state": "approved",
        "submissionId": 5803210,
        "submissionObject": "public_audience_request",
        "submissionOutcome": "change_audience",
        "submittedAt": 1566159030,
        "targetAudience": "public",
        "workflowId": 2285,
        "submissionDetails": {
          "permissionType": "READ"
        },
        "submissionOutcomeApplication": {
          "failureCount": 0,
          "status": "success"
        },
        "submitter": {
          "id": "5fuc-pqz2",
          "displayName": "NYC OpenData"
        }
      }
    ],
    "clientContext": {
      "clientContextVariables": [],
      "inheritedVariables": {}
    },
    "columns": [
      {
        "id": 581848519,
        "name": "Complaint Number",
        "dataTypeName": "text",
        "description": "Complaint number starting with borough code: (1= Manhattan, 2= Bronx, 3 = Brooklyn, 4 = Queens, 5 = Staten Island)",
        "fieldName": "complaint_number",
        "position": 1,
        "renderTypeName": "text",
        "tableColumnId": 9628780,
        "width": 127,
        "format": {}
      },
      {
        "id": 581848520,
        "name": "Status",
        "dataTypeName": "text",
        "description": "Status of Complaint",
        "fieldName": "status",
        "position": 2,
        "renderTypeName": "text",
        "tableColumnId": 9628781,
        "width": 106,
        "format": {}
      },
      {
        "id": 581848521,
        "name": "Date Entered",
        "dataTypeName": "text",
        "description": "Date Complaint was Entered",
        "fieldName": "date_entered",
        "position": 3,
        "renderTypeName": "text",
        "tableColumnId": 9628782,
        "width": 111,
        "format": {}
      },
      {
        "id": 581848522,
        "name": "House Number",
        "dataTypeName": "text",
        "description": "House Number of Complaint",
        "fieldName": "house_number",
        "position": 4,
        "renderTypeName": "text",
        "tableColumnId": 9628783,
        "width": 122,
        "format": {}
      },
      {
        "id": 581848523,
        "name": "House Street",
        "dataTypeName": "text",
        "description": "House Street of Complaint",
        "fieldName": "house_street",
        "position": 5,
        "renderTypeName": "text",
        "tableColumnId": 9628784,
        "width": 163,
        "format": {}
      },
      {
        "id": 581848524,
        "name": "ZIP Code",
        "dataTypeName": "text",
        "description": "Zip code of complaint\n",
        "fieldName": "zip_code",
        "position": 6,
        "renderTypeName": "text",
        "tableColumnId": 45193476,
        "width": 100,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 581848525,
        "name": "BIN",
        "dataTypeName": "text",
        "description": "Number assigned by City Planning to a specific building",
        "fieldName": "bin",
        "position": 7,
        "renderTypeName": "text",
        "tableColumnId": 9628785,
        "width": 78,
        "format": {}
      },
      {
        "id": 581848526,
        "name": "Community Board",
        "dataTypeName": "text",
        "description": "3-digit identifier: Borough code = first position, last 2 = community board",
        "fieldName": "community_board",
        "position": 8,
        "renderTypeName": "text",
        "tableColumnId": 9628786,
        "width": 127,
        "format": {}
      },
      {
        "id": 581848527,
        "name": "Special District",
        "dataTypeName": "text",
        "description": "Is Complaint in Special District",
        "fieldName": "special_district",
        "position": 9,
        "renderTypeName": "text",
        "tableColumnId": 9628787,
        "width": 119,
        "format": {}
      },
      {
        "id": 581848528,
        "name": "Complaint Category",
        "dataTypeName": "text",
        "description": "DOB Complaint Category Codes (01-Accident Construction/Plumbing, etc.) ",
        "fieldName": "complaint_category",
        "position": 10,
        "renderTypeName": "text",
        "tableColumnId": 9628788,
        "width": 141,
        "format": {}
      },
      {
        "id": 581848529,
        "name": "Unit",
        "dataTypeName": "text",
        "description": "Unit dispositioning Complaint",
        "fieldName": "unit",
        "position": 11,
        "renderTypeName": "text",
        "tableColumnId": 9628789,
        "width": 80,
        "format": {}
      },
      {
        "id": 581848530,
        "name": "Disposition Date",
        "dataTypeName": "text",
        "description": "Date Complaint was Dispositioned",
        "fieldName": "disposition_date",
        "position": 12,
        "renderTypeName": "text",
        "tableColumnId": 9628790,
        "width": 127,
        "format": {}
      },
      {
        "id": 581848531,
        "name": "Disposition Code",
        "dataTypeName": "text",
        "description": "Disposition Code of Complaint (A1-Building Violations Served, L1-Partial Stop Work Order,etc.) ",
        "fieldName": "disposition_code",
        "position": 13,
        "renderTypeName": "text",
        "tableColumnId": 9628791,
        "width": 124,
        "format": {}
      },
      {
        "id": 581848532,
        "name": "Inspection Date",
        "dataTypeName": "text",
        "description": "Inspection Date of Complaint",
        "fieldName": "inspection_date",
        "position": 14,
        "renderTypeName": "text",
        "tableColumnId": 9628792,
        "width": 128,
        "format": {}
      },
      {
        "id": 581848533,
        "name": "DOBRunDate",
        "dataTypeName": "text",
        "description": "Date when query is run and pushed to Open Data. Could be used to differentiate report dates.",
        "fieldName": "dobrundate",
        "position": 15,
        "renderTypeName": "text",
        "tableColumnId": 148582729,
        "width": 166,
        "format": {
          "align": "left"
        }
      }
    ],
    "grants": [
      {
        "inherited": false,
        "type": "viewer",
        "flags": [
          "public"
        ]
      }
    ],
    "metadata": {
      "rdfSubject": "0",
      "attachments": [
        {
          "filename": "DD_DOB_Complaints_Received_2019-08-21.xlsx",
          "assetId": "e19c463a-69dd-4810-ae72-3c7c7fc657f8",
          "name": "DD_DOB_Complaints_Received_2019-08-21.xlsx"
        },
        {
          "filename": "DOBComplaints_complaint_category_list.pdf",
          "assetId": "dc709ed2-7af1-429c-92c9-71ec3a4c23fa",
          "name": "DOBComplaints_complaint_category_list.pdf"
        }
      ],
      "custom_fields": {
        "Update": {
          "Automation": "Yes",
          "Date Made Public": "4/26/2013",
          "Update Frequency": "Daily"
        },
        "Dataset Information": {
          "Agency": "Department of Buildings (DOB)"
        }
      },
      "rowLabel": "Row",
      "availableDisplayTypes": [
        "table",
        "fatrow",
        "page"
      ]
    },
    "owner": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "query": {},
    "rights": [
      "read"
    ],
    "tableAuthor": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "tags": [
      "complaints",
      "dob",
      "buildings"
    ],
    "flags": [
      "default",
      "ownerMayBeContacted",
      "restorable",
      "restorePossibleForType"
    ]
  },
  {
    "id": "dntt-gqwq",
    "name": "Sidewalk Management Database - Inspection",
    "assetType": "dataset",
    "attribution": "Department of Transportation (DOT)",
    "averageRating": 0,
    "category": "Transportation",
    "createdAt": 1695909786,
    "description": "Sidewalk Management System is used to track and organize inspections, violations and the status of New York City sidewalks Identifies locations where DOT inspectors performed sidewalk inspections for defects.\nFor more information please visit NYC DOT website: www.nyc.gov/sidewalks",
    "diciBackend": false,
    "displayType": "table",
    "downloadCount": 469,
    "hideFromCatalog": false,
    "hideFromDataJson": false,
    "locked": false,
    "newBackend": true,
    "numberOfComments": 0,
    "oid": 41069596,
    "provenance": "official",
    "publicationAppendEnabled": true,
    "publicationDate": 1737494417,
    "publicationGroup": 19304324,
    "publicationStage": "published",
    "rowClass": "",
    "rowsUpdatedAt": 1752408446,
    "rowsUpdatedBy": "5fuc-pqz2",
    "tableId": 19747108,
    "totalTimesRated": 0,
    "viewCount": 587,
    "viewLastModified": 1752408156,
    "viewType": "tabular",
    "approvals": [
      {
        "reviewedAt": 1738351159,
        "reviewedAutomatically": false,
        "state": "approved",
        "submissionId": 6725875,
        "submissionObject": "public_audience_request",
        "submissionOutcome": "change_audience",
        "submittedAt": 1738348778,
        "targetAudience": "public",
        "workflowId": 2285,
        "reviewer": {
          "id": "5fuc-pqz2",
          "displayName": "NYC OpenData"
        },
        "submissionDetails": {
          "permissionType": "read"
        },
        "submissionOutcomeApplication": {
          "endedAt": 1738351159,
          "failureCount": 0,
          "startedAt": 1738351159,
          "status": "success"
        },
        "submitter": {
          "id": "5fuc-pqz2",
          "displayName": "NYC OpenData"
        }
      }
    ],
    "clientContext": {
      "clientContextVariables": [],
      "inheritedVariables": {}
    },
    "columns": [
      {
        "id": 604407858,
        "name": "Inspection ID",
        "dataTypeName": "text",
        "description": "Unique five digit numerical ID used to track inspection records.",
        "fieldName": "inspectionid",
        "position": 1,
        "renderTypeName": "text",
        "tableColumnId": 155898617,
        "cachedContents": {
          "non_null": "384141",
          "largest": "99999",
          "null": "0",
          "top": [
            {
              "item": "228173",
              "count": "1"
            },
            {
              "item": "12377",
              "count": "1"
            },
            {
              "item": "118912",
              "count": "1"
            },
            {
              "item": "228949",
              "count": "1"
            },
            {
              "item": "229303",
              "count": "1"
            },
            {
              "item": "380431",
              "count": "1"
            },
            {
              "item": "47586",
              "count": "1"
            },
            {
              "item": "33223",
              "count": "1"
            },
            {
              "item": "274048",
              "count": "1"
            },
            {
              "item": "161860",
              "count": "1"
            },
            {
              "item": "277012",
              "count": "1"
            },
            {
              "item": "36232",
              "count": "1"
            },
            {
              "item": "263953",
              "count": "1"
            },
            {
              "item": "401081",
              "count": "1"
            },
            {
              "item": "205804",
              "count": "1"
            },
            {
              "item": "41570",
              "count": "1"
            },
            {
              "item": "389777",
              "count": "1"
            },
            {
              "item": "84765",
              "count": "1"
            },
            {
              "item": "284667",
              "count": "1"
            },
            {
              "item": "390048",
              "count": "1"
            }
          ],
          "smallest": "1",
          "count": "384141",
          "cardinality": "384141"
        },
        "format": {
          "decimalSeparator": ".",
          "noCommas": "true",
          "groupSeparator": ","
        }
      },
      {
        "id": 604407882,
        "name": "No Violation Found",
        "dataTypeName": "text",
        "description": "The inspection did not identify any sidewalk defects.",
        "fieldName": "noviolationfound",
        "position": 2,
        "renderTypeName": "text",
        "tableColumnId": 156408168,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "277449"
            },
            {
              "item": "Yes",
              "count": "106692"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407883,
        "name": "City Do It",
        "dataTypeName": "text",
        "description": "Property owner requests that the city performs the sidewalk repairs.",
        "fieldName": "citydoit",
        "position": 3,
        "renderTypeName": "text",
        "tableColumnId": 156408169,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "380613"
            },
            {
              "item": "Yes",
              "count": "3528"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407876,
        "name": "Owner Will Do It",
        "dataTypeName": "text",
        "description": "Property owner will perform the sidewalk repairs.",
        "fieldName": "ownerwilldoit",
        "position": 4,
        "renderTypeName": "text",
        "tableColumnId": 156408162,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "382262"
            },
            {
              "item": "Yes",
              "count": "1879"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407875,
        "name": "Capital Project Conflict Flag",
        "dataTypeName": "text",
        "description": "Identifies if there is a capital project with planned work at the taxlot",
        "fieldName": "capconflictflag",
        "position": 5,
        "renderTypeName": "text",
        "tableColumnId": 156408161,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "381712"
            },
            {
              "item": "Yes",
              "count": "2429"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407863,
        "name": "Capital Project Conflict(s)",
        "dataTypeName": "text",
        "description": "Identified there is a capital reconstruction project with sidewalk repairs at the location.",
        "fieldName": "capitalconflicts",
        "position": 6,
        "renderTypeName": "text",
        "tableColumnId": 148700379,
        "cachedContents": {
          "non_null": "25813",
          "largest": "YES",
          "null": "358328",
          "top": [
            {
              "item": "QN Kissena",
              "count": "2694"
            },
            {
              "item": "GK0H15-03",
              "count": "2421"
            },
            {
              "item": "BK-GK0H15-04",
              "count": "2128"
            },
            {
              "item": "HPD93",
              "count": "1619"
            },
            {
              "item": "GK0H15-02",
              "count": "1246"
            },
            {
              "item": "GKOH15-01",
              "count": "1101"
            },
            {
              "item": "BX-Parkchester",
              "count": "869"
            },
            {
              "item": "Corona Hub",
              "count": "830"
            },
            {
              "item": "HWTRK1",
              "count": "551"
            },
            {
              "item": "HWQ121B3",
              "count": "546"
            },
            {
              "item": "GK0H15-01",
              "count": "436"
            },
            {
              "item": "BX-CXHP08PAR",
              "count": "420"
            },
            {
              "item": "HWK876",
              "count": "393"
            },
            {
              "item": "BX-Hendrix",
              "count": "363"
            },
            {
              "item": "SEQPGRD1",
              "count": "337"
            },
            {
              "item": "SEQPGRD2",
              "count": "331"
            },
            {
              "item": "HWQ274F2",
              "count": "329"
            },
            {
              "item": "GKCI05-01",
              "count": "270"
            },
            {
              "item": "GQTI03-23",
              "count": "264"
            },
            {
              "item": "GKCI05-03",
              "count": "209"
            }
          ],
          "smallest": ".",
          "count": "384141",
          "cardinality": "300"
        },
        "format": {}
      },
      {
        "id": 604407881,
        "name": "Cancel",
        "dataTypeName": "text",
        "description": "An outstanding violation cancelled - no sidewalk defects identified.",
        "fieldName": "cancel",
        "position": 7,
        "renderTypeName": "text",
        "tableColumnId": 156408167,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "382466"
            },
            {
              "item": "Yes",
              "count": "1675"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407865,
        "name": "Inspection Date",
        "dataTypeName": "calendar_date",
        "description": "Inspection Date",
        "fieldName": "inspectiondate",
        "position": 8,
        "renderTypeName": "calendar_date",
        "tableColumnId": 148705069,
        "cachedContents": {
          "non_null": "340524",
          "largest": "9862-10-01T00:00:00.000",
          "null": "43617",
          "top": [
            {
              "item": "2010-06-10T00:00:00.000",
              "count": "388"
            },
            {
              "item": "2010-05-20T00:00:00.000",
              "count": "377"
            },
            {
              "item": "2010-08-03T00:00:00.000",
              "count": "368"
            },
            {
              "item": "2010-08-13T00:00:00.000",
              "count": "353"
            },
            {
              "item": "2010-04-27T00:00:00.000",
              "count": "351"
            },
            {
              "item": "2011-07-20T00:00:00.000",
              "count": "321"
            },
            {
              "item": "2010-08-11T00:00:00.000",
              "count": "319"
            },
            {
              "item": "2010-05-14T00:00:00.000",
              "count": "315"
            },
            {
              "item": "2010-08-26T00:00:00.000",
              "count": "306"
            },
            {
              "item": "2010-06-03T00:00:00.000",
              "count": "306"
            },
            {
              "item": "2017-07-11T00:00:00.000",
              "count": "298"
            },
            {
              "item": "2010-08-27T00:00:00.000",
              "count": "294"
            },
            {
              "item": "2017-06-28T00:00:00.000",
              "count": "292"
            },
            {
              "item": "2010-06-25T00:00:00.000",
              "count": "292"
            },
            {
              "item": "2017-06-15T00:00:00.000",
              "count": "291"
            },
            {
              "item": "2010-06-02T00:00:00.000",
              "count": "287"
            },
            {
              "item": "2010-04-28T00:00:00.000",
              "count": "285"
            },
            {
              "item": "2016-11-16T00:00:00.000",
              "count": "282"
            },
            {
              "item": "2010-05-04T00:00:00.000",
              "count": "275"
            },
            {
              "item": "2010-10-20T00:00:00.000",
              "count": "272"
            }
          ],
          "smallest": "1859-09-01T00:00:00.000",
          "count": "384141",
          "cardinality": "7430"
        },
        "format": {
          "view": "date",
          "decimalSeparator": ".",
          "groupSeparator": ","
        }
      },
      {
        "id": 604407877,
        "name": "Is 311 Inspection",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred at a taxlot where a 311 complaint for defective sidewalk was received.",
        "fieldName": "is_311_inspection",
        "position": 9,
        "renderTypeName": "text",
        "tableColumnId": 156408163,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "328887"
            },
            {
              "item": "Yes",
              "count": "55254"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407867,
        "name": "Material ID",
        "dataTypeName": "text",
        "description": "The type of material used for sidewalk.",
        "fieldName": "materialid",
        "position": 10,
        "renderTypeName": "text",
        "tableColumnId": 148700374,
        "cachedContents": {
          "non_null": "3776",
          "largest": "8",
          "null": "380365",
          "top": [
            {
              "item": "5",
              "count": "2325"
            },
            {
              "item": "1",
              "count": "800"
            },
            {
              "item": "6",
              "count": "232"
            },
            {
              "item": "7",
              "count": "161"
            },
            {
              "item": "3",
              "count": "136"
            },
            {
              "item": "8",
              "count": "74"
            },
            {
              "item": "2",
              "count": "46"
            },
            {
              "item": "4",
              "count": "2"
            }
          ],
          "smallest": "1",
          "count": "384141",
          "cardinality": "8"
        },
        "format": {}
      },
      {
        "id": 604407884,
        "name": "Pickup Sidewalk",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred at a taxlot where a 311 complaint for defective sidewalk was received on the block.",
        "fieldName": "pickupsidewalk",
        "position": 11,
        "renderTypeName": "text",
        "tableColumnId": 156408170,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "242958"
            },
            {
              "item": "Yes",
              "count": "141183"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407880,
        "name": "Curb311",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred at a taxlot where a 311 complaint for defective curb was received.",
        "fieldName": "curb311",
        "position": 12,
        "renderTypeName": "text",
        "tableColumnId": 156408166,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "374739"
            },
            {
              "item": "Yes",
              "count": "9402"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407879,
        "name": "Pickup curb",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred at a taxlot where a 311 complaint for defective curb was received on the block.",
        "fieldName": "pickupcurb",
        "position": 13,
        "renderTypeName": "text",
        "tableColumnId": 156408165,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "360569"
            },
            {
              "item": "Yes",
              "count": "23572"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407871,
        "name": "Other",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred due to a reason other than the receipt of a 311 complaint or correspondence.",
        "fieldName": "other",
        "position": 14,
        "renderTypeName": "text",
        "tableColumnId": 148700370,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "354820"
            },
            {
              "item": "Yes",
              "count": "29321"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407878,
        "name": "Correspondence",
        "dataTypeName": "text",
        "description": "To determine if the sidewalk inspection occurred at a taxlot where correspondence was received.",
        "fieldName": "correspondence",
        "position": 15,
        "renderTypeName": "text",
        "tableColumnId": 156408164,
        "cachedContents": {
          "non_null": "384141",
          "largest": "Yes",
          "null": "0",
          "top": [
            {
              "item": "No",
              "count": "382257"
            },
            {
              "item": "Yes",
              "count": "1884"
            }
          ],
          "smallest": "No",
          "count": "384141",
          "cardinality": "2"
        },
        "format": {}
      },
      {
        "id": 604407873,
        "name": "Damage ID",
        "dataTypeName": "text",
        "description": "A numerical code identifying the root of the sidewalk damage.",
        "fieldName": "damageid",
        "position": 16,
        "renderTypeName": "text",
        "tableColumnId": 155898624,
        "cachedContents": {
          "non_null": "384141",
          "largest": "6",
          "null": "0",
          "top": [
            {
              "item": "5",
              "count": "320173"
            },
            {
              "item": "6",
              "count": "22925"
            },
            {
              "item": "3",
              "count": "17305"
            },
            {
              "item": "4",
              "count": "8746"
            },
            {
              "item": "1",
              "count": "7725"
            },
            {
              "item": "2",
              "count": "7267"
            }
          ],
          "smallest": "1",
          "count": "384141",
          "cardinality": "6"
        },
        "format": {
          "decimalSeparator": ".",
          "groupSeparator": ","
        }
      },
      {
        "id": 604407874,
        "name": "Damage Type Code",
        "dataTypeName": "text",
        "description": "Identifies if all or any of the sidewalk defects are caused by a City tree",
        "fieldName": "damagetypecode",
        "position": 17,
        "renderTypeName": "text",
        "tableColumnId": 148700368,
        "cachedContents": {
          "non_null": "384141",
          "largest": "PT",
          "null": "0",
          "top": [
            {
              "item": "NS",
              "count": "320173"
            },
            {
              "item": "NL",
              "count": "22925"
            },
            {
              "item": "NT",
              "count": "17305"
            },
            {
              "item": "ND",
              "count": "8746"
            },
            {
              "item": "AT",
              "count": "7725"
            },
            {
              "item": "PT",
              "count": "7267"
            }
          ],
          "smallest": "AT",
          "count": "384141",
          "cardinality": "6"
        },
        "format": {}
      }
    ],
    "grants": [
      {
        "inherited": false,
        "type": "viewer",
        "flags": [
          "public"
        ]
      }
    ],
    "metadata": {
      "rdfSubject": "0",
      "rdfClass": "",
      "attachments": [
        {
          "filename": "Data_Dictionary-_SidewalkManagementDatabase.xlsx",
          "assetId": "e5762c58-3e39-485b-b09c-a0f8555fb86a",
          "name": "Data_Dictionary-_SidewalkManagementDatabase.xlsx"
        }
      ],
      "custom_fields": {
        "Data Collection": {
          "Data Collection": "DOT Sidewalk Management Database"
        },
        "Update": {
          "Automation": "Yes",
          "Date Made Public": "1/31/2025",
          "Update Frequency": "Daily",
          "Data Change Frequency": "Daily"
        },
        "Dataset Information": {
          "Agency": "Department of Transportation (DOT)"
        }
      },
      "rowLabel": "sidewalk defect inspection.",
      "availableDisplayTypes": [
        "table",
        "fatrow",
        "page"
      ]
    },
    "owner": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "query": {},
    "rights": [
      "read"
    ],
    "tableAuthor": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "tags": [
      "sidewalk",
      "inspection",
      "violations",
      "repinspection",
      "tree",
      "sidewalk management database"
    ],
    "flags": [
      "default",
      "ownerMayBeContacted",
      "restorable",
      "restorePossibleForType"
    ]
  },
  {
    "id": "5ijn-vbdv",
    "name": "311 Resolution Satisfaction Survey",
    "assetType": "dataset",
    "attribution": "Office of Technology and Innovation (OTI)",
    "averageRating": 0,
    "category": "City Government",
    "createdAt": 1746473398,
    "description": "Every customer who makes a <a href=\"https://data.cityofnewyork.us/d/erm2-nwe9\" target=\"_blank\" rel=\"noopener\">Service Request to 311</a> and provides their contact information is offered the 311 Resolution Satisfaction Survey to provide feedback on their satisfaction with how a City Agency resolved their problem. Each row of data represents a survey response, and contains information about the survey response and the underlying service request. \n\nIn order to protect the anonymity of survey responses, the time the response is completed is aggregated to the month, and the location the service request pertains to is aggregated to the borough.\n\nSee the <a href=\"https://data.cityofnewyork.us/d/kizp-4dfk\" target=\"_blank\" rel=\"noopener\">311 Customer Satisfaction Survey</a> dataset for customer feedback on the performance of 311 call takers.",
    "diciBackend": false,
    "displayType": "table",
    "downloadCount": 166,
    "hideFromCatalog": false,
    "hideFromDataJson": false,
    "locked": false,
    "newBackend": true,
    "numberOfComments": 0,
    "oid": 41305945,
    "provenance": "official",
    "publicationAppendEnabled": true,
    "publicationDate": 1746631362,
    "publicationGroup": 19880866,
    "publicationStage": "published",
    "rowsUpdatedAt": 1751893444,
    "rowsUpdatedBy": "5fuc-pqz2",
    "tableId": 19882066,
    "totalTimesRated": 0,
    "viewCount": 559,
    "viewLastModified": 1751893220,
    "viewType": "tabular",
    "approvals": [
      {
        "reviewedAt": 1748013703,
        "reviewedAutomatically": false,
        "state": "approved",
        "submissionId": 6896942,
        "submissionObject": "public_audience_request",
        "submissionOutcome": "change_audience",
        "submittedAt": 1748013666,
        "targetAudience": "public",
        "workflowId": 2285,
        "reviewer": {
          "id": "8u8s-8cxv",
          "displayName": "Zachary Feder (NYC Open Data)"
        },
        "submissionDetails": {
          "permissionType": "read"
        },
        "submissionOutcomeApplication": {
          "endedAt": 1748013703,
          "failureCount": 0,
          "startedAt": 1748013703,
          "status": "success"
        },
        "submitter": {
          "id": "8u8s-8cxv",
          "displayName": "Zachary Feder (NYC Open Data)"
        }
      }
    ],
    "clientContext": {
      "clientContextVariables": [],
      "inheritedVariables": {}
    },
    "columns": [
      {
        "id": 609644073,
        "name": "Unique Key",
        "dataTypeName": "text",
        "description": "Unique identifier of a survey response in this dataset.",
        "fieldName": "unique_key",
        "position": 1,
        "renderTypeName": "text",
        "tableColumnId": 158320760,
        "cachedContents": {
          "non_null": "364689",
          "largest": "99999674-00274995",
          "null": "0",
          "top": [
            {
              "item": "10000702-00102921",
              "count": "1"
            },
            {
              "item": "10000736-00284282",
              "count": "1"
            },
            {
              "item": "10000826-00222122",
              "count": "1"
            },
            {
              "item": "10000916-00002850",
              "count": "1"
            },
            {
              "item": "10001252-00010663",
              "count": "1"
            },
            {
              "item": "10001412-00233697",
              "count": "1"
            },
            {
              "item": "10001615-00112502",
              "count": "1"
            },
            {
              "item": "10001671-00114914",
              "count": "1"
            },
            {
              "item": "10001793-00350980",
              "count": "1"
            },
            {
              "item": "10001811-00039612",
              "count": "1"
            },
            {
              "item": "10002317-00105132",
              "count": "1"
            },
            {
              "item": "10002493-00265604",
              "count": "1"
            },
            {
              "item": "10002498-00346111",
              "count": "1"
            },
            {
              "item": "10002657-00372764",
              "count": "1"
            },
            {
              "item": "10002776-00097700",
              "count": "1"
            },
            {
              "item": "10002786-00020770",
              "count": "1"
            },
            {
              "item": "10002869-00145672",
              "count": "1"
            },
            {
              "item": "10002962-00255598",
              "count": "1"
            },
            {
              "item": "10003119-00191325",
              "count": "1"
            },
            {
              "item": "10003246-00252053",
              "count": "1"
            }
          ],
          "smallest": "10000394-00133450",
          "count": "364689",
          "cardinality": "364689"
        },
        "format": {}
      },
      {
        "id": 609644074,
        "name": "Agency Acronym",
        "dataTypeName": "text",
        "description": "Acronym of responding City Government Agency or entity responding to 311 service request that the survey response corresponds to.",
        "fieldName": "agency",
        "position": 2,
        "renderTypeName": "text",
        "tableColumnId": 158320762,
        "cachedContents": {
          "non_null": "364689",
          "largest": "TLC",
          "null": "0",
          "top": [
            {
              "item": "NYPD",
              "count": "165140"
            },
            {
              "item": "HPD",
              "count": "59623"
            },
            {
              "item": "DSNY",
              "count": "43640"
            },
            {
              "item": "DEP",
              "count": "26472"
            },
            {
              "item": "DPR",
              "count": "20193"
            },
            {
              "item": "DOT",
              "count": "15763"
            },
            {
              "item": "DOF",
              "count": "11174"
            },
            {
              "item": "DOB",
              "count": "7888"
            },
            {
              "item": "DOHMH",
              "count": "7231"
            },
            {
              "item": "DCWP",
              "count": "2558"
            },
            {
              "item": "DHS",
              "count": "2412"
            },
            {
              "item": "TLC",
              "count": "1303"
            },
            {
              "item": "EDC",
              "count": "867"
            },
            {
              "item": "OTI",
              "count": "269"
            },
            {
              "item": "DOE",
              "count": "136"
            },
            {
              "item": "DFTA",
              "count": "15"
            },
            {
              "item": "DORIS",
              "count": "4"
            },
            {
              "item": "NYCEM",
              "count": "1"
            }
          ],
          "smallest": "DCWP",
          "count": "364689",
          "cardinality": "18"
        },
        "format": {}
      },
      {
        "id": 609644075,
        "name": "Agency Name",
        "dataTypeName": "text",
        "description": "Full agency name of responding City Government Agency, or entity responding to 311 service request that the survey response corresponds to.",
        "fieldName": "agency_name",
        "position": 3,
        "renderTypeName": "text",
        "tableColumnId": 158320761,
        "cachedContents": {
          "non_null": "364595",
          "largest": "Taxi and Limousine Commission",
          "null": "94",
          "top": [
            {
              "item": "New York City Police Department",
              "count": "165108"
            },
            {
              "item": "Department of Housing Preservation and Development",
              "count": "59595"
            },
            {
              "item": "Department of Sanitation",
              "count": "43204"
            },
            {
              "item": "Department of Environmental Protection",
              "count": "26464"
            },
            {
              "item": "Department of Parks and Recreation",
              "count": "20177"
            },
            {
              "item": "Department of Transportation",
              "count": "15758"
            },
            {
              "item": "Department of Finance",
              "count": "11166"
            },
            {
              "item": "Department of Buildings",
              "count": "7883"
            },
            {
              "item": "Department of Health and Mental Hygiene",
              "count": "7231"
            },
            {
              "item": "Department of Consumer and Worker Protection",
              "count": "2558"
            },
            {
              "item": "Department of Homeless Services",
              "count": "2412"
            },
            {
              "item": "Taxi and Limousine Commission",
              "count": "1302"
            },
            {
              "item": "Economic Development Corporation",
              "count": "867"
            },
            {
              "item": "nyc311-prd",
              "count": "448"
            },
            {
              "item": "Office of Technology and Innovation",
              "count": "268"
            },
            {
              "item": "Department of Education",
              "count": "134"
            },
            {
              "item": "Department for the Aging",
              "count": "15"
            },
            {
              "item": "Department of Records and Information Services",
              "count": "4"
            },
            {
              "item": "NYC Emergency Management",
              "count": "1"
            }
          ],
          "smallest": "Department for the Aging",
          "count": "364689",
          "cardinality": "19"
        },
        "format": {}
      },
      {
        "id": 609644076,
        "name": "Complaint Type",
        "dataTypeName": "text",
        "description": "The Complaint Type of the service request that the survey corresponds to. The Complaint Type is the first level of a hierarchy identifying the topic of the incident or condition. Complaint Type broadly describes the topic of the incident or condition and are defined by the responding agencies.",
        "fieldName": "complaint_type",
        "position": 4,
        "renderTypeName": "text",
        "tableColumnId": 158320759,
        "cachedContents": {
          "non_null": "364689",
          "largest": "Zoning Violation",
          "null": "0",
          "top": [
            {
              "item": "Illegal Parking",
              "count": "81527"
            },
            {
              "item": "Noise - Residential",
              "count": "23906"
            },
            {
              "item": "Blocked Driveway",
              "count": "21808"
            },
            {
              "item": "Heat/Hot Water",
              "count": "20474"
            },
            {
              "item": "Missed Collection",
              "count": "14426"
            },
            {
              "item": "Abandoned Vehicle",
              "count": "12473"
            },
            {
              "item": "Unsanitary Condition",
              "count": "9234"
            },
            {
              "item": "Noise - Commercial",
              "count": "8546"
            },
            {
              "item": "Noise - Street/Sidewalk",
              "count": "8349"
            },
            {
              "item": "Water Maintenance",
              "count": "8286"
            },
            {
              "item": "Noise",
              "count": "7722"
            },
            {
              "item": "Dirty Condition",
              "count": "7649"
            },
            {
              "item": "Sewer Maintenance",
              "count": "6155"
            },
            {
              "item": "Illegal Dumping",
              "count": "5846"
            },
            {
              "item": "Street Condition",
              "count": "5846"
            },
            {
              "item": "Paint/Plaster",
              "count": "5496"
            },
            {
              "item": "Plumbing",
              "count": "5483"
            },
            {
              "item": "DOF Literature Request",
              "count": "5162"
            },
            {
              "item": "Water Leak",
              "count": "4582"
            },
            {
              "item": "Encampment",
              "count": "4312"
            }
          ],
          "smallest": "Abandoned Bike",
          "count": "364689",
          "cardinality": "206"
        },
        "format": {}
      },
      {
        "id": 609644077,
        "name": "Descriptor",
        "dataTypeName": "text",
        "description": "The Descriptor of the service request that the survey corresponds to. The Descriptor is associated to the Complaint Type, and provides further detail on the incident or condition. Descriptor values are dependent on the Complaint Type, and are not always required in the service request.",
        "fieldName": "descriptor",
        "position": 5,
        "renderTypeName": "text",
        "tableColumnId": 158320758,
        "cachedContents": {
          "non_null": "351795",
          "largest": "Zoning Violation",
          "null": "12894",
          "top": [
            {
              "item": "Blocked Sidewalk",
              "count": "34457"
            },
            {
              "item": "Loud Music/Party",
              "count": "27571"
            },
            {
              "item": "No Access",
              "count": "15263"
            },
            {
              "item": "Blocked Hydrant",
              "count": "13330"
            },
            {
              "item": "Apartment Only",
              "count": "13201"
            },
            {
              "item": "Posted Parking Sign Violation",
              "count": "13121"
            },
            {
              "item": "Trash",
              "count": "10836"
            },
            {
              "item": "Banging/Pounding",
              "count": "10393"
            },
            {
              "item": "With License Plate",
              "count": "7824"
            },
            {
              "item": "Entire Building",
              "count": "7273"
            },
            {
              "item": "Partial Access",
              "count": "6545"
            },
            {
              "item": "Commercial Overnight Parking",
              "count": "6351"
            },
            {
              "item": "Removal Request",
              "count": "4922"
            },
            {
              "item": "Pests",
              "count": "4918"
            },
            {
              "item": "Without License Plate",
              "count": "4649"
            },
            {
              "item": "Mold",
              "count": "3482"
            },
            {
              "item": "Loud Talking",
              "count": "3142"
            },
            {
              "item": "Construction",
              "count": "3068"
            },
            {
              "item": "Compost",
              "count": "2963"
            },
            {
              "item": "Trees and Sidewalks Program",
              "count": "2792"
            }
          ],
          "smallest": "1 or 2",
          "count": "364689",
          "cardinality": "740"
        },
        "format": {}
      },
      {
        "id": 609644078,
        "name": "Borough",
        "dataTypeName": "text",
        "description": "The borough in which the customer reported a problem",
        "fieldName": "borough",
        "position": 6,
        "renderTypeName": "text",
        "tableColumnId": 158320757,
        "cachedContents": {
          "non_null": "364251",
          "largest": "STATEN ISLAND",
          "null": "438",
          "top": [
            {
              "item": "BROOKLYN",
              "count": "129662"
            },
            {
              "item": "QUEENS",
              "count": "90018"
            },
            {
              "item": "MANHATTAN",
              "count": "71637"
            },
            {
              "item": "BRONX",
              "count": "55652"
            },
            {
              "item": "STATEN ISLAND",
              "count": "17282"
            }
          ],
          "smallest": "BRONX",
          "count": "364689",
          "cardinality": "5"
        },
        "format": {}
      },
      {
        "id": 609644079,
        "name": "Resolution Description",
        "dataTypeName": "text",
        "description": "Describes the last action taken on the service request by the responding agency. May describe next or future steps.",
        "fieldName": "resolution_description",
        "position": 7,
        "renderTypeName": "text",
        "tableColumnId": 158320754,
        "cachedContents": {
          "non_null": "362933",
          "largest": "You withdrew your complaint. The Department of Consumer and Worker Protection (DCWP) will not take any action.",
          "null": "1756",
          "top": [
            {
              "item": "The Department of Housing Preservation and Development conducted or attempted to conduct an inspection.  More information about inspection results can be found through HPD's website at www.nyc.gov/hpd by using HPDONLINE (enter your address on the home page) and entering your SR number under the complaint status option.",
              "count": "47295"
            },
            {
              "item": "The Police Department responded to the complaint and took action to fix the condition.",
              "count": "45128"
            },
            {
              "item": "The Police Department responded to the complaint and determined that police action was not necessary.",
              "count": "41700"
            },
            {
              "item": "The Police Department responded to the complaint and with the information available observed no evidence of the violation at that time.",
              "count": "28374"
            },
            {
              "item": "The Police Department issued a summons in response to the complaint.",
              "count": "20737"
            },
            {
              "item": "The Police Department responded and upon arrival those responsible for the condition were gone.",
              "count": "17401"
            },
            {
              "item": "The Department of Sanitation collected the requested items.",
              "count": "9667"
            },
            {
              "item": "The Department of Sanitation investigated this complaint and found no condition at the location.",
              "count": "9495"
            },
            {
              "item": "The literature you requested has been mailed to you. Please allow additional time for delivery.",
              "count": "6725"
            },
            {
              "item": "The Department of Housing Preservation and Development has closed this complaint administratively. More information can be found through HPD's website at www.nyc.gov/hpd by using HPDONLINE (enter your address on the home page) and entering your SR number under the complaint status option.",
              "count": "6161"
            },
            {
              "item": "The Department of Housing Preservation and Development contacted an occupant of the apartment or building and verified that the complaint was addressed.  The complaint has been closed.",
              "count": "5844"
            },
            {
              "item": "The Department of Environmental Protection determined that this complaint is a duplicate of a previously filed complaint. The original complaint is being addressed.",
              "count": "4868"
            },
            {
              "item": "The Department of Sanitation cleaned the location.",
              "count": "4741"
            },
            {
              "item": "The Department of Sanitation investigated this complaint and found no violation at the location.",
              "count": "4317"
            },
            {
              "item": "The Department of Buildings investigated this complaint and determined that no further action was necessary.",
              "count": "3495"
            },
            {
              "item": "NYC Parks visited the site and inspected the condition. No work is necessary at this time.",
              "count": "3101"
            },
            {
              "item": "The Police Department reviewed your complaint and provided additional information below.",
              "count": "2981"
            },
            {
              "item": "The Department of Environmental Protection (DEP) didn't observe a violation of the NYC Air or Noise Code at the time of inspection and couldn't issue a summons.If the problem still exists, please go to nyc.gov/311 or call 311 to file a new Service Request. If you're outside of New York City, please call (212) NEW-YORK (212-639-9675).",
              "count": "2934"
            },
            {
              "item": "See notes.",
              "count": "2839"
            },
            {
              "item": "This complaint does not fall under the Police Department's jurisdiction.",
              "count": "2705"
            }
          ],
          "smallest": "A Department of Transportation field crew met the customer at the problem meter and returned the credit card to the customer.",
          "count": "364689",
          "cardinality": "634"
        },
        "format": {}
      },
      {
        "id": 609644080,
        "name": "Survey Year",
        "dataTypeName": "number",
        "description": "The year in which the customer began filling out the survey",
        "fieldName": "year",
        "position": 8,
        "renderTypeName": "number",
        "tableColumnId": 158320752,
        "cachedContents": {
          "non_null": "364689",
          "largest": "2025",
          "null": "0",
          "top": [
            {
              "item": "2024",
              "count": "137871"
            },
            {
              "item": "2023",
              "count": "108462"
            },
            {
              "item": "2025",
              "count": "81677"
            },
            {
              "item": "2022",
              "count": "36679"
            }
          ],
          "smallest": "2022",
          "count": "364689",
          "cardinality": "4"
        },
        "format": {
          "noCommas": "true"
        }
      },
      {
        "id": 609644081,
        "name": "Survey Month",
        "dataTypeName": "number",
        "description": "The month in which the customer began filling out the survey",
        "fieldName": "month",
        "position": 9,
        "renderTypeName": "number",
        "tableColumnId": 158320753,
        "cachedContents": {
          "non_null": "364689",
          "largest": "12",
          "null": "0",
          "top": [
            {
              "item": "6",
              "count": "38238"
            },
            {
              "item": "1",
              "count": "37937"
            },
            {
              "item": "3",
              "count": "36268"
            },
            {
              "item": "5",
              "count": "36258"
            },
            {
              "item": "4",
              "count": "34416"
            },
            {
              "item": "12",
              "count": "34115"
            },
            {
              "item": "10",
              "count": "33641"
            },
            {
              "item": "11",
              "count": "32492"
            },
            {
              "item": "2",
              "count": "28918"
            },
            {
              "item": "7",
              "count": "19206"
            },
            {
              "item": "8",
              "count": "17773"
            },
            {
              "item": "9",
              "count": "15427"
            }
          ],
          "smallest": "1",
          "count": "364689",
          "cardinality": "12"
        },
        "format": {
          "decimalSeparator": ".",
          "groupSeparator": ","
        }
      },
      {
        "id": 609644082,
        "name": "Satisfaction Response",
        "dataTypeName": "text",
        "description": "Customers are asked to respond to the statement \"Overall, I am satisfied with the way my Service Request was handled.\"",
        "fieldName": "overall_satisfaction",
        "position": 10,
        "renderTypeName": "text",
        "tableColumnId": 158320756,
        "cachedContents": {
          "non_null": "364689",
          "largest": "Strongly Disagree",
          "null": "0",
          "top": [
            {
              "item": "Strongly Disagree",
              "count": "195821"
            },
            {
              "item": "Strongly Agree",
              "count": "87566"
            },
            {
              "item": "Agree",
              "count": "34406"
            },
            {
              "item": "Disagree",
              "count": "29227"
            },
            {
              "item": "Neutral",
              "count": "17669"
            }
          ],
          "smallest": "Agree",
          "count": "364689",
          "cardinality": "5"
        },
        "format": {}
      },
      {
        "id": 609644083,
        "name": "Dissatisfaction Reason",
        "dataTypeName": "text",
        "description": "If someone was dissatisfied (responded 'Disagree' or 'Strongly Disagree'), they are asked to choose a reason why from a list or select 'Other' to write their own explanation.",
        "fieldName": "dissatisfaction_reason",
        "position": 11,
        "renderTypeName": "text",
        "tableColumnId": 158320755,
        "cachedContents": {
          "non_null": "224612",
          "largest": "The Agency said I did not provide complete or accurate information, but I did.",
          "null": "140077",
          "top": [
            {
              "item": "The Agency did not correct the issue.",
              "count": "110718"
            },
            {
              "item": "Other",
              "count": "67366"
            },
            {
              "item": "Status updates were unhelpful, inaccurate, incomplete, and/or confusing.",
              "count": "18152"
            },
            {
              "item": "The Agency did not correct the issue and this Service Request should be reopened.",
              "count": "16036"
            },
            {
              "item": "The Agency corrected the issue, but they took too long to respond.",
              "count": "4192"
            },
            {
              "item": "The Agency said I did not provide complete or accurate information, but I did.",
              "count": "3407"
            },
            {
              "item": "The Agency did not provide enough status updates.",
              "count": "2589"
            },
            {
              "item": "The Agency corrected the issue, but the work they did was unsatisfactory.",
              "count": "2152"
            }
          ],
          "smallest": "Other",
          "count": "364689",
          "cardinality": "8"
        },
        "format": {}
      }
    ],
    "grants": [
      {
        "inherited": false,
        "type": "viewer",
        "flags": [
          "public"
        ]
      }
    ],
    "metadata": {
      "attachments": [
        {
          "filename": "311 Resolution Satisfaction Survey Data Dictionary.xlsx",
          "assetId": "87ca2932-bfa8-4145-831c-7b32e9c6cf54",
          "name": "311 Resolution Satisfaction Survey Data Dictionary.xlsx"
        }
      ],
      "custom_fields": {
        "Update": {
          "Automation": "Yes",
          "Date Made Public": "5/23/2025",
          "Update Frequency": "Weekly",
          "Data Change Frequency": "Daily"
        },
        "Dataset Information": {
          "Agency": "Office of Technology and Innovation (OTI)"
        }
      },
      "rowLabel": "survey response",
      "availableDisplayTypes": [
        "table",
        "fatrow",
        "page"
      ]
    },
    "owner": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "query": {},
    "rights": [
      "read"
    ],
    "tableAuthor": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "tags": [
      "311",
      "311 service requests",
      "complaints",
      "survey",
      "rsat"
    ],
    "flags": [
      "default",
      "ownerMayBeContacted",
      "restorable",
      "restorePossibleForType"
    ]
  }
]

Hunted for correct 311 noise complaint dataset, came up empty.
5s



Let me search for the actual 311 service request dataset that would contain the noise complaint data.

favicon

search
Request

{
  `query`: `311 service requests 2025`
}
Response

[
  {
    "id": "erm2-nwe9:catalog",
    "score": 1
  },
  {
    "id": "jwvp-gyiq:catalog",
    "score": 0.9
  },
  {
    "id": "cs9t-e3x8:catalog",
    "score": 0.8
  },
  {
    "id": "5ijn-vbdv:catalog",
    "score": 0.7
  },
  {
    "id": "dzvt-6g3v:catalog",
    "score": 0.6
  },
  {
    "id": "3rfa-3xsf:catalog",
    "score": 0.5
  },
  {
    "id": "mu46-p9is:catalog",
    "score": 0.3999999999999999
  },
  {
    "id": "sqcr-6mww:catalog",
    "score": 0.29999999999999993
  },
  {
    "id": "vwpc-kje2:catalog",
    "score": 0.19999999999999996
  },
  {
    "id": "rn6p-xvjd:catalog",
    "score": 0.09999999999999998
  }
]

Tracked down potential 311 service requests dataset.
0s


Let me get the details for the main 311 service requests dataset.

favicon

document_retrieval
Request

{
  `ids`: [
    `erm2-nwe9:catalog`
  ]
}
Response

[
  {
    "id": "erm2-nwe9",
    "name": "311 Service Requests from 2010 to Present",
    "assetType": "dataset",
    "attribution": "311",
    "averageRating": 0,
    "category": "Social Services",
    "createdAt": 1318225937,
    "description": "<b>NOTE:</b> The 311 dataset is currently showing incorrect values in the \"Agency Name\" column. Please use the \"Agency\" column in the interim while this is being resolved.\n<p>\nAll 311 Service Requests from 2010 to present. This information is automatically updated daily.\n</p>",
    "diciBackend": false,
    "displayType": "table",
    "downloadCount": 467309,
    "hideFromCatalog": false,
    "hideFromDataJson": false,
    "locked": false,
    "newBackend": true,
    "numberOfComments": 19,
    "oid": 41118039,
    "provenance": "official",
    "publicationAppendEnabled": false,
    "publicationDate": 1738887773,
    "publicationGroup": 244403,
    "publicationStage": "published",
    "rowClass": "",
    "rowIdentifierColumnId": 605256022,
    "rowsUpdatedAt": 1752371242,
    "rowsUpdatedBy": "5fuc-pqz2",
    "tableId": 19776606,
    "totalTimesRated": 0,
    "viewCount": 1031422,
    "viewLastModified": 1739290270,
    "viewType": "tabular",
    "approvals": [
      {
        "reviewedAt": 1524193398,
        "reviewedAutomatically": true,
        "state": "approved",
        "submissionId": 6739709,
        "submissionObject": "public_audience_request",
        "submissionOutcome": "change_audience",
        "submittedAt": 1524193398,
        "targetAudience": "public",
        "workflowId": 2285,
        "submissionDetails": {
          "permissionType": "READ"
        },
        "submissionOutcomeApplication": {
          "failureCount": 0,
          "status": "success"
        },
        "submitter": {
          "id": "5fuc-pqz2",
          "displayName": "NYC OpenData"
        }
      }
    ],
    "clientContext": {
      "clientContextVariables": [],
      "inheritedVariables": {}
    },
    "columns": [
      {
        "id": 605256022,
        "name": "Unique Key",
        "dataTypeName": "text",
        "description": "Unique identifier of a Service Request (SR) in the open data set\n",
        "fieldName": "unique_key",
        "position": 1,
        "renderTypeName": "text",
        "tableColumnId": 1567787,
        "width": 220,
        "format": {}
      },
      {
        "id": 605256023,
        "name": "Created Date",
        "dataTypeName": "calendar_date",
        "description": "Date SR  was created\n",
        "fieldName": "created_date",
        "position": 2,
        "renderTypeName": "calendar_date",
        "tableColumnId": 1567788,
        "width": 244,
        "format": {
          "view": "date_time",
          "align": "left"
        }
      },
      {
        "id": 605256024,
        "name": "Closed Date",
        "dataTypeName": "calendar_date",
        "description": "Date SR was closed by responding agency\n",
        "fieldName": "closed_date",
        "position": 3,
        "renderTypeName": "calendar_date",
        "tableColumnId": 1567789,
        "width": 232,
        "format": {
          "view": "date_time",
          "align": "left"
        }
      },
      {
        "id": 605256025,
        "name": "Agency",
        "dataTypeName": "text",
        "description": "Acronym of responding City Government Agency\n",
        "fieldName": "agency",
        "position": 4,
        "renderTypeName": "text",
        "tableColumnId": 1567790,
        "width": 172,
        "format": {}
      },
      {
        "id": 605256026,
        "name": "Agency Name",
        "dataTypeName": "text",
        "description": "Full Agency name of responding City Government Agency",
        "fieldName": "agency_name",
        "position": 5,
        "renderTypeName": "text",
        "tableColumnId": 1567791,
        "width": 232,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256027,
        "name": "Complaint Type",
        "dataTypeName": "text",
        "description": "This is the first level of a hierarchy identifying the topic of the incident or condition. Complaint Type may have a corresponding Descriptor (below) or may stand alone.",
        "fieldName": "complaint_type",
        "position": 6,
        "renderTypeName": "text",
        "tableColumnId": 1567792,
        "width": 268,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256028,
        "name": "Descriptor",
        "dataTypeName": "text",
        "description": "This is  associated to the Complaint Type, and provides further detail on the incident or condition. Descriptor values are dependent on the Complaint Type, and are not always required in SR. \n",
        "fieldName": "descriptor",
        "position": 7,
        "renderTypeName": "text",
        "tableColumnId": 1567793,
        "width": 220,
        "format": {}
      },
      {
        "id": 605256029,
        "name": "Location Type",
        "dataTypeName": "text",
        "description": "Describes the type of location used in the address information \n",
        "fieldName": "location_type",
        "position": 8,
        "renderTypeName": "text",
        "tableColumnId": 1567794,
        "width": 256,
        "format": {}
      },
      {
        "id": 605256030,
        "name": "Incident Zip",
        "dataTypeName": "text",
        "description": "Incident location zip code, provided by geo validation.\n",
        "fieldName": "incident_zip",
        "position": 9,
        "renderTypeName": "text",
        "tableColumnId": 1567795,
        "width": 244,
        "format": {}
      },
      {
        "id": 605256031,
        "name": "Incident Address",
        "dataTypeName": "text",
        "description": "House number of incident address provided by submitter.\n",
        "fieldName": "incident_address",
        "position": 10,
        "renderTypeName": "text",
        "tableColumnId": 1567796,
        "width": 292,
        "format": {}
      },
      {
        "id": 605256032,
        "name": "Street Name",
        "dataTypeName": "text",
        "description": "Street name of incident address provided by the submitter\n",
        "fieldName": "street_name",
        "position": 11,
        "renderTypeName": "text",
        "tableColumnId": 1567797,
        "width": 232,
        "format": {}
      },
      {
        "id": 605256033,
        "name": "Cross Street 1",
        "dataTypeName": "text",
        "description": "First Cross street based on the geo validated incident location\n",
        "fieldName": "cross_street_1",
        "position": 12,
        "renderTypeName": "text",
        "tableColumnId": 1567798,
        "width": 268,
        "format": {}
      },
      {
        "id": 605256034,
        "name": "Cross Street 2",
        "dataTypeName": "text",
        "description": "Second Cross Street based on the geo validated incident location\n",
        "fieldName": "cross_street_2",
        "position": 13,
        "renderTypeName": "text",
        "tableColumnId": 1567799,
        "width": 268,
        "format": {}
      },
      {
        "id": 605256035,
        "name": "Intersection Street 1",
        "dataTypeName": "text",
        "description": "First intersecting street based on geo validated incident location\n",
        "fieldName": "intersection_street_1",
        "position": 14,
        "renderTypeName": "text",
        "tableColumnId": 1567800,
        "width": 352,
        "format": {}
      },
      {
        "id": 605256036,
        "name": "Intersection Street 2",
        "dataTypeName": "text",
        "description": "Second intersecting street based on geo validated incident location\n",
        "fieldName": "intersection_street_2",
        "position": 15,
        "renderTypeName": "text",
        "tableColumnId": 1567801,
        "width": 352,
        "format": {}
      },
      {
        "id": 605256037,
        "name": "Address Type",
        "dataTypeName": "text",
        "description": "Type of incident location information available.\n",
        "fieldName": "address_type",
        "position": 16,
        "renderTypeName": "text",
        "tableColumnId": 1567802,
        "width": 244,
        "format": {}
      },
      {
        "id": 605256038,
        "name": "City",
        "dataTypeName": "text",
        "description": "City of the incident location provided by geovalidation.\n",
        "fieldName": "city",
        "position": 17,
        "renderTypeName": "text",
        "tableColumnId": 1567803,
        "width": 148,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256039,
        "name": "Landmark",
        "dataTypeName": "text",
        "description": "If the incident location is identified as a Landmark the name of the landmark will display here\n",
        "fieldName": "landmark",
        "position": 18,
        "renderTypeName": "text",
        "tableColumnId": 1567804,
        "width": 196,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256040,
        "name": "Facility Type",
        "dataTypeName": "text",
        "description": "If available, this field describes the type of city facility associated to the SR\n",
        "fieldName": "facility_type",
        "position": 19,
        "renderTypeName": "text",
        "tableColumnId": 1567805,
        "width": 256,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256041,
        "name": "Status",
        "dataTypeName": "text",
        "description": "Status of SR submitted \n",
        "fieldName": "status",
        "position": 20,
        "renderTypeName": "text",
        "tableColumnId": 1567806,
        "width": 172,
        "format": {}
      },
      {
        "id": 605256042,
        "name": "Due Date",
        "dataTypeName": "calendar_date",
        "description": "Date when responding agency is expected to update the SR.  This is based on the Complaint Type and internal Service Level Agreements (SLAs).\n",
        "fieldName": "due_date",
        "position": 21,
        "renderTypeName": "calendar_date",
        "tableColumnId": 1567807,
        "width": 196,
        "format": {
          "view": "date_time",
          "align": "left"
        }
      },
      {
        "id": 605256043,
        "name": "Resolution Description",
        "dataTypeName": "text",
        "description": "Describes the last action taken on the SR by the responding agency.  May describe next or future steps. \n",
        "fieldName": "resolution_description",
        "position": 22,
        "renderTypeName": "text",
        "tableColumnId": 27922513,
        "width": 186,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256044,
        "name": "Resolution Action Updated Date",
        "dataTypeName": "calendar_date",
        "description": "Date when responding agency last updated the SR.\n",
        "fieldName": "resolution_action_updated_date",
        "position": 23,
        "renderTypeName": "calendar_date",
        "tableColumnId": 1567808,
        "width": 460,
        "format": {
          "view": "date_time",
          "align": "left"
        }
      },
      {
        "id": 605256045,
        "name": "Community Board",
        "dataTypeName": "text",
        "description": "Provided by geovalidation.\n",
        "fieldName": "community_board",
        "position": 24,
        "renderTypeName": "text",
        "tableColumnId": 1567809,
        "width": 280,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256046,
        "name": "BBL",
        "dataTypeName": "text",
        "description": "Borough Block and Lot, provided by geovalidation. Parcel number to identify the location of location of buildings and properties in NYC.",
        "fieldName": "bbl",
        "position": 25,
        "renderTypeName": "text",
        "tableColumnId": 63788374,
        "width": 100,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256047,
        "name": "Borough",
        "dataTypeName": "text",
        "description": "Provided by the submitter and confirmed by geovalidation.\n",
        "fieldName": "borough",
        "position": 26,
        "renderTypeName": "text",
        "tableColumnId": 1567810,
        "width": 184,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256048,
        "name": "X Coordinate (State Plane)",
        "dataTypeName": "number",
        "description": "Geo validated, X coordinate of the incident location. \n",
        "fieldName": "x_coordinate_state_plane",
        "position": 27,
        "renderTypeName": "number",
        "tableColumnId": 1567811,
        "width": 412,
        "format": {
          "precisionStyle": "standard",
          "noCommas": "false",
          "align": "right"
        }
      },
      {
        "id": 605256049,
        "name": "Y Coordinate (State Plane)",
        "dataTypeName": "number",
        "description": "Geo validated,  Y coordinate of the incident location. \n",
        "fieldName": "y_coordinate_state_plane",
        "position": 28,
        "renderTypeName": "number",
        "tableColumnId": 1567812,
        "width": 412,
        "format": {
          "precisionStyle": "standard",
          "noCommas": "false",
          "align": "right"
        }
      },
      {
        "id": 605256050,
        "name": "Open Data Channel Type",
        "dataTypeName": "text",
        "description": "Indicates how the SR was submitted to 311.  i.e. By Phone, Online, Mobile, Other or Unknown.",
        "fieldName": "open_data_channel_type",
        "position": 29,
        "renderTypeName": "text",
        "tableColumnId": 63788381,
        "width": 100,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256051,
        "name": "Park Facility Name",
        "dataTypeName": "text",
        "description": "If the incident location is a Parks Dept facility, the Name of the facility will appear here\n",
        "fieldName": "park_facility_name",
        "position": 30,
        "renderTypeName": "text",
        "tableColumnId": 1567813,
        "width": 316,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256052,
        "name": "Park Borough",
        "dataTypeName": "text",
        "description": "The borough of incident if it is a Parks Dept facility\n",
        "fieldName": "park_borough",
        "position": 31,
        "renderTypeName": "text",
        "tableColumnId": 1567814,
        "width": 244,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256064,
        "name": "Vehicle Type",
        "dataTypeName": "text",
        "description": "If the incident is a taxi, this field describes the type of TLC vehicle. \n",
        "fieldName": "vehicle_type",
        "position": 43,
        "renderTypeName": "text",
        "tableColumnId": 1567826,
        "width": 244,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256065,
        "name": "Taxi Company Borough",
        "dataTypeName": "text",
        "description": "If the incident is identified as a taxi, this field will display the borough of the taxi company. \n",
        "fieldName": "taxi_company_borough",
        "position": 44,
        "renderTypeName": "text",
        "tableColumnId": 1567827,
        "width": 340,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256066,
        "name": "Taxi Pick Up Location",
        "dataTypeName": "text",
        "description": "If the incident is identified as a taxi, this field displays the taxi pick up location\n",
        "fieldName": "taxi_pick_up_location",
        "position": 45,
        "renderTypeName": "text",
        "tableColumnId": 1567828,
        "width": 352,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256067,
        "name": "Bridge Highway Name",
        "dataTypeName": "text",
        "description": "If the incident is identified as a Bridge/Highway, the name will be displayed here.\n",
        "fieldName": "bridge_highway_name",
        "position": 46,
        "renderTypeName": "text",
        "tableColumnId": 1567829,
        "width": 328,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256068,
        "name": "Bridge Highway Direction",
        "dataTypeName": "text",
        "description": "If the incident is identified as a Bridge/Highway, the direction where the issue took place would be displayed here.\n",
        "fieldName": "bridge_highway_direction",
        "position": 47,
        "renderTypeName": "text",
        "tableColumnId": 1567830,
        "width": 388,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256069,
        "name": "Road Ramp",
        "dataTypeName": "text",
        "description": "If the incident location was Bridge/Highway this column differentiates if the issue was on the Road or the Ramp.\n",
        "fieldName": "road_ramp",
        "position": 48,
        "renderTypeName": "text",
        "tableColumnId": 1567831,
        "width": 208,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256070,
        "name": "Bridge Highway Segment",
        "dataTypeName": "text",
        "description": "Additional information on the section of the Bridge/Highway were the incident took place.\n",
        "fieldName": "bridge_highway_segment",
        "position": 49,
        "renderTypeName": "text",
        "tableColumnId": 1567832,
        "width": 364,
        "format": {
          "displayStyle": "plain",
          "align": "left"
        }
      },
      {
        "id": 605256074,
        "name": "Latitude",
        "dataTypeName": "number",
        "description": "Geo based Lat of the incident location\n",
        "fieldName": "latitude",
        "position": 53,
        "renderTypeName": "number",
        "tableColumnId": 1567836,
        "width": 196,
        "format": {
          "precisionStyle": "standard",
          "noCommas": "false",
          "align": "right"
        }
      },
      {
        "id": 605256075,
        "name": "Longitude",
        "dataTypeName": "number",
        "description": "Geo based Long of the incident location\n",
        "fieldName": "longitude",
        "position": 54,
        "renderTypeName": "number",
        "tableColumnId": 1567837,
        "width": 208,
        "format": {
          "precisionStyle": "standard",
          "noCommas": "false",
          "align": "right"
        }
      },
      {
        "id": 605256076,
        "name": "Location",
        "dataTypeName": "location",
        "description": "Combination of the geo based lat & long of the incident location\n",
        "fieldName": "location",
        "position": 55,
        "renderTypeName": "location",
        "tableColumnId": 1567838,
        "width": 196,
        "format": {
          "view": "coords",
          "align": "left"
        }
      },
      {
        "id": 605256081,
        "name": "Zip Codes",
        "dataTypeName": "number",
        "fieldName": ":@computed_region_efsh_h5xi",
        "position": 60,
        "renderTypeName": "number",
        "tableColumnId": 78454605,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_efsh-h5xi",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      },
      {
        "id": 605256082,
        "name": "Community Districts",
        "dataTypeName": "number",
        "fieldName": ":@computed_region_f5dn_yrer",
        "position": 61,
        "renderTypeName": "number",
        "tableColumnId": 78454606,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_f5dn-yrer",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      },
      {
        "id": 605256083,
        "name": "Borough Boundaries",
        "dataTypeName": "number",
        "fieldName": ":@computed_region_yeji_bk3q",
        "position": 62,
        "renderTypeName": "number",
        "tableColumnId": 78454607,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_yeji-bk3q",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      },
      {
        "id": 605256084,
        "name": "City Council Districts",
        "dataTypeName": "number",
        "fieldName": ":@computed_region_92fq_4b7q",
        "position": 63,
        "renderTypeName": "number",
        "tableColumnId": 78454608,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_92fq-4b7q",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      },
      {
        "id": 605256085,
        "name": "Police Precincts",
        "dataTypeName": "number",
        "fieldName": ":@computed_region_sbqj_enih",
        "position": 64,
        "renderTypeName": "number",
        "tableColumnId": 78454609,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_sbqj-enih",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      },
      {
        "id": 605256086,
        "name": "Police Precinct",
        "dataTypeName": "number",
        "description": "This column was automatically created in order to record in what polygon from the dataset 'Police Precinct' (7mpf-4k6g) the point in column 'location' is located.  This enables the creation of region maps (choropleths) in the visualization canvas and data lens.",
        "fieldName": ":@computed_region_7mpf_4k6g",
        "position": 65,
        "renderTypeName": "number",
        "tableColumnId": 150178015,
        "computationStrategy": {
          "source_columns": [
            "location"
          ],
          "type": "georegion_match_on_point",
          "parameters": {
            "region": "_7mpf-4k6g",
            "primary_key": "_feature_id"
          }
        },
        "format": {}
      }
    ],
    "grants": [
      {
        "inherited": false,
        "type": "viewer",
        "flags": [
          "public"
        ]
      }
    ],
    "metadata": {
      "rdfSubject": "0",
      "rdfClass": "",
      "jsonQuery": {
        "order": [
          {
            "columnFieldName": "created_date",
            "ascending": false
          }
        ]
      },
      "attachments": [
        {
          "filename": "311_ServiceRequest_2010-Present_DataDictionary_Updated_2023.xlsx",
          "assetId": "b372b884-f86a-453b-ba16-1fe06ce9d212",
          "name": "311_ServiceRequest_2010-Present_DataDictionary_Updated_2023.xlsx"
        }
      ],
      "custom_fields": {
        "Update": {
          "Automation": "Yes",
          "Date Made Public": "10/18/2011",
          "Update Frequency": "Daily"
        },
        "Dataset Information": {
          "Agency": "Office of Technology and Innovation (OTI)"
        }
      },
      "filterCondition": {
        "metadata": {
          "advanced": true,
          "unifiedVersion": 2
        },
        "children": [
          {
            "metadata": {
              "tableColumnId": {
                "244403": 1567787
              },
              "operator": "EQUALS"
            },
            "type": "operator",
            "value": "OR"
          }
        ],
        "type": "operator",
        "value": "AND"
      },
      "rowIdentifier": 605256022,
      "rowLabel": "311 Service Request",
      "availableDisplayTypes": [
        "table",
        "fatrow",
        "page"
      ],
      "renderTypeConfig": {
        "visible": {
          "table": true
        }
      }
    },
    "owner": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "query": {
      "orderBys": [
        {
          "ascending": false,
          "expression": {
            "columnId": 605256023,
            "type": "column"
          }
        }
      ]
    },
    "rights": [
      "read"
    ],
    "tableAuthor": {
      "id": "5fuc-pqz2",
      "displayName": "NYC OpenData",
      "profileImageUrlLarge": "/api/users/5fuc-pqz2/profile_images/LARGE",
      "profileImageUrlMedium": "/api/users/5fuc-pqz2/profile_images/THUMB",
      "profileImageUrlSmall": "/api/users/5fuc-pqz2/profile_images/TINY",
      "screenName": "NYC OpenData",
      "type": "interactive",
      "flags": [
        "acceptedEula",
        "mayBeStoriesCoOwner"
      ]
    },
    "tags": [
      "311",
      "311 service requests",
      "city government",
      "socialservices",
      "service request status",
      "all service requests",
      "rodent",
      "rat",
      "bike",
      "pothole",
      "complaints"
    ],
    "flags": [
      "default",
      "ownerMayBeContacted",
      "restorable",
      "restorePossibleForType"
    ]
  }
]

Strategized querying NYC Open Data for Brooklyn noise complaints.
4s




Perfect! I found the 311 Service Requests dataset. Now I'll query it to count noise complaints in Brooklyn for June 2025. Let me analyze this data.


Analyzed data
View analysis

javascript

// Query the NYC Open Data API for 311 noise complaints in Brooklyn for June 2025
// Dataset ID: erm2-nwe9

const datasetId = 'erm2-nwe9';
const baseUrl = `https://data.cityofnewyork.us/resource/${datasetId}.json`;

// Build the query
// We need to filter for:
// - Borough = 'BROOKLYN'
// - Created Date in June 2025
// - Complaint Type containing 'Noise'

// Format dates for June 2025
const startDate = '2025-06-01T00:00:00.000';
const endDate = '2025-06-30T23:59:59.999';

// Build SoQL query
const query = new URLSearchParams({
    '$where': `borough = 'BROOKLYN' AND created_date >= '${startDate}' AND created_date <= '${endDate}' AND (complaint_type LIKE '%Noise%')`,
    '$select': 'count(*) as noise_complaint_count',
    '$limit': '1'
});

const url = `${baseUrl}?${query}`;

console.log('Querying URL:', url);

// Fetch the data
const response = await fetch(url);
const data = await response.json();

console.log('Response:', data);

// Get the count
const count = data[0]?.noise_complaint_count || 0;
console.log(`\nTotal noise complaints in Brooklyn for June 2025: ${count}`);

// Let's also break it down by complaint type to see the different types of noise complaints
const detailQuery = new URLSearchParams({
    '$where': `borough = 'BROOKLYN' AND created_date >= '${startDate}' AND created_date <= '${endDate}' AND (complaint_type LIKE '%Noise%')`,
    '$select': 'complaint_type, count(*) as count',
    '$group': 'complaint_type',
    '$order': 'count DESC',
    '$limit': '20'
});

const detailUrl = `${baseUrl}?${detailQuery}`;
console.log('\nQuerying for breakdown by complaint type...');

const detailResponse = await fetch(detailUrl);
const detailData = await detailResponse.json();

console.log('\nBreakdown of noise complaints by type:');
detailData.forEach(item => {
    console.log(`${item.complaint_type}: ${item.count}`);
});

// Calculate total from detailed breakdown
const totalFromBreakdown = detailData.reduce((sum, item) => sum + parseInt(item.count), 0);
console.log(`\nTotal from breakdown: ${totalFromBreakdown}`);
Output

Result

Querying URL: https://data.cityofnewyork.us/resource/erm2-nwe9.json?%24where=borough+%3D+%27BROOKLYN%27+AND+created_date+%3E%3D+%272025-06-01T00%3A00%3A00.000%27+AND+created_date+%3C%3D+%272025-06-30T23%3A59%3A59.999%27+AND+%28complaint_type+LIKE+%27%25Noise%25%27%29&%24select=count%28*%29+as+noise_complaint_count&%24limit=1
Error

Error

Failed to fetch

Strategized alternative data retrieval method for API challenge.
2s


Let me search for recent information about NYC 311 noise complaints in Brooklyn for June 2025.


NYC 311 noise complaints Brooklyn June 2025 statistics
10 results






















Probed NYC noise complaint data for specific Brooklyn information.
4s



Let me search more specifically for Brooklyn noise complaint data from June 2025.


"Brooklyn" "noise complaints" "June 2025" 311 NYC data
0 results


Strategized alternative data retrieval for NYC noise complaint query.
2s


Let me try to access the NYC Open Data API directly for this specific query.


Failed to fetch https://data.cityofnewyork.us/resource/erm2-nwe9.json?$where=borough='BROOKLYN' AND created_date between '2025-06-01T00:00:00' and '2025-06-30T23:59:59' AND complaint_type like '%25Noise%25'&$limit=50000

Pondered searching for NYC Open Data API link.
2s


Let me search for a direct NYC Open Data query link for 311 noise complaints.


NYC Open Data API 311 noise complaints query Brooklyn 2025
10 results






















Scoped out NYC Open Data for noise complaint sources.
2s


Let me fetch the main 311 Service Requests page from NYC Open Data.


Fetched Menu
cityofnewyork.us


Investigated alternative method to retrieve noise complaint data.
1s


Let me try fetching the specific 311 Noise Complaints dataset page.


Fetched Menu
cityofnewyork.us


Thought process
1s

The NYC Open Data pages aren't loading properly through web_fetch. Let me search for recent reporting or statistics about NYC 311 noise complaints that might include Brooklyn data for June 2025.

Let me search for recent reports or statistics on NYC 311 noise complaints that might include specific data for Brooklyn in 2025.


NYC 311 noise complaints statistics report 2025 Brooklyn monthly data
10 results






















Hunted for elusive Brooklyn noise complaint data.
3s


Let me search for the NYC311 Monitoring Tool mentioned by State Comptroller DiNapoli, which might have the specific data for Brooklyn.


"NYC311 Monitoring Tool" DiNapoli Brooklyn noise complaints data
7 results
















Probed NYC311 tool for potential noise complaint data.
1s


Let me access the NYC311 Monitoring Tool directly from the State Comptroller's website.

favicon

Fetched NYC311 Monitoring Tool
ny.gov


Thought process
1s

I see there's a link to download data and a report from the State Comptroller's office. Let me try to access the report that might contain the data I need.

Let me fetch the State Comptroller's report that might contain recent 311 complaint data.

favicon

Failed to fetch https://www.osc.ny.gov/files/reports/pdf/report-3-2026.pdf

Probed alternative methods to retrieve NYC 311 data.
2s


Based on my search through NYC Open Data and various sources, I apologize but I cannot find the specific number of 311 noise complaints for Brooklyn in June 2025. Here's what I can tell you:

General Context About NYC 311 Noise Complaints:
In 2024, the city's 311 hotline received over 738,000 noise complaints, making it the top issue called in by residents. 
Noise tops NYC's 311 complaints list in 2024 | FOX 5 New York
 New Yorkers reported over 2,000 noise complaints per day in 2024 
Noise tops NYC's 311 complaints list in 2024 | FOX 5 New York
, with residential noise topped the list within this category, accounting for more than 356,000 complaints. 
Noise tops NYC's 311 complaints list in 2024 | FOX 5 New York

Through the tool, the state comptroller found illegal parking complaints were the highest in Brooklyn while the residential noise complaints were the highest in the Bronx.

Data Availability:
The NYC 311 Service Requests dataset (dataset ID: erm2-nwe9) on NYC Open Data contains all 311 requests from 2010 to present and is updated daily. This dataset includes complaint types, borough information, and created dates, which would allow filtering for noise complaints in Brooklyn during June 2025.

Accessing the Data:
To get the specific count of noise complaints for Brooklyn in June 2025, you would need to:

Visit NYC Open Data
Filter the data by:
Borough = "BROOKLYN"
Created Date between June 1, 2025 and June 30, 2025
Complaint Type containing "Noise"
Alternatively, the State Comptroller's new NYC311 Monitoring Tool provides neighborhood-level insights on monthly requests by complaint type and might have the specific data you're looking for.

Would you like me to help you with instructions on how to query the NYC Open Data portal directly to get this information?