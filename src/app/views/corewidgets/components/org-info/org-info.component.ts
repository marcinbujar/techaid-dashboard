import { Component, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';

const QUERY_ENTITY = gql`
query findOrganisation($id: Long!) {
  organisation(where: {
    id: {
      _eq: $id
    }
  }){
     id
     website
     phoneNumber
     contact
     name
     email
     createdAt
     updatedAt
     kits {
      id
      model
      age
      type
      status
      location
      updatedAt
      createdAt
    }
     attributes {
       notes
       accepts
       alternateAccepts
       request {
         laptops
         tablets 
         phones
         allInOnes
       }
       alternateRequest {
         laptops
         tablets 
         phones
         allInOnes
       }
     }
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateOrganisation($data: UpdateOrganisationInput!) {
  updateOrganisation(data: $data){
     id
     website
     phoneNumber
     contact
     name
     email
     createdAt
     updatedAt
     kits {
      id
      model
      age
      type
      status
      location
      updatedAt
      createdAt
     }
     attributes {
       notes
       accepts
       alternateAccepts
       request {
         laptops
         tablets 
         phones
         allInOnes
       }
       alternateRequest {
         laptops
         tablets 
         phones
         allInOnes
       }
     }
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteOrganisation($id: ID!) {
  deleteOrganisation(id: $id)
}
`;

@Component({
  selector: 'org-info',
  styleUrls: ['org-info.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './org-info.html'
})
export class OrgInfoComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  model : any = {};
  entityName: string;
  entityId: number;

  fields: Array<FormlyFieldConfig> = [
    {
      key: "attributes.notes",
      type: "textarea",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Notes about the organisation",
        rows: 5,
        required: false
      } 
    },
    {
      key: "name",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Name",
        placeholder: "",
        required: true
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
      }
    },
    {
      key: "website",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Website",
        placeholder: "",
        required: false
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
      }
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "contact",
          type: "input",
          className: "col-md-12",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Name",
            placeholder: "",
            required: true
          },
          validation: {
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
          }
        },
        {
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.phoneNumber.length'
          }
        },
        {
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Phone Number",
            pattern: /\+?[0-9]+/,
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.email.length'
          }
        },
      ]
    }, 
    {
      key: "attributes.accepts",
      type: "multicheckbox",
      className: "",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "What types of devices are you looking for?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
        ],
        required: true
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
      }
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: "!model.attributes.accepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following items can you currently take?</p>
          `
        },
        {
          key: "attributes.request.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
    },
    {
      key: "attributes.alternateAccepts",
      type: "multicheckbox",
      className: "",
      hideExpression: "!model.attributes.accepts.length || model.attributes.accepts.length == 4",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "If none of the items listed above are available, would you be willing to consider any of the following?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
        ],
        required: false
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
        'templateOptions.options': (model, state) => {
          const opts = [
            {value: "LAPTOPS", label: "Laptops"},
            {value: "PHONES", label: "Phones"},
            {value: "TABLETS", label: "Tablets" },
            {value: "ALLINONES", label: "All In Ones" },
          ];
          var values = opts.filter(o => (model.attributes.accepts || []).indexOf(o.value) == -1);
          return values;
        }
      }
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: "!model.attributes.alternateAccepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following alternate items are you willing to take?</p>
          `
        },
        {
          key: "attributes.alternateRequest.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') > -1 || model.attributes.alternateAccepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') > -1 || model.attributes.alternateAccepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
    }, 
  ];

  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  private normalizeData(data: any){
    return data;
  }

  private fetchData() {
    if (!this.entityId) {
      return;
    }

    this.queryRef.refetch({
      id: this.entityId
    }).then(res => {
      if (res.data && res.data['organisation']) {
        var data = res.data['organisation'];
        this.model = this.normalizeData(data);
        this.entityName = this.model['name']
      } else {
        this.model = {};
        this.entityName = "Not Found!"
      }
    }, err => {
      this.toastr.warning(`
          <small>${err.message}</small>
        `, 'GraphQL Error', {
          enableHtml: true,
          timeOut: 15000,
          disableTimeOut: true
        })
    });
  }

  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe(params => {
      this.entityId = +params['orgId'];
      this.fetchData();
    });
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    if(!this.form.valid){
      this.model.showErrorState = true;
      return false;
    }
    data.id = this.entityId;
    this.apollo.mutate({
      mutation: UPDATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.model = this.normalizeData(res.data['updateOrganisation']);
      this.entityName = this.model['name'];
      this.toastr.info(`
      <small>Successfully updated organisation ${this.entityName}</small>
      `, 'Updated Template', {
          enableHtml: true
        });
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Update Error', {
          enableHtml: true
        });
    })
  }

  deleteEntity() {
    this.apollo.mutate({
      mutation: DELETE_ENTITY,
      variables: { id: this.entityId }
    }).subscribe(res => {
      if(res.data.deleteEmailTemplate){
        this.toastr.info(`
        <small>Successfully deleted organisation ${this.entityName}</small>
        `, 'Organisation Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/organisations'])
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Organisation', {
          enableHtml: true
        });
    })
  }
}