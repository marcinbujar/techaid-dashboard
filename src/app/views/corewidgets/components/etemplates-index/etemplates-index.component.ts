import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from "@app/shared/modules/grid/app-grid.directive";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { query } from '@angular/animations';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { Select } from '@ngxs/store';
import * as Tablesaw from 'tablesaw';
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_ENTITY = gql`
query findAllTemplates($page: PaginationInput,, $term: String) {
  emailTemplatesConnection(page: $page, where: {
    AND: {
      OR: [
        {
          subject: {
            _contains: $term
          }
        },
        {
          body: {
            _contains: $term
          }
        }
      ]
    }
  }){
    totalElements
    content{
     id
     active
     subject
     body
     createdAt
     updatedAt
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createFaq($data: CreateEmailTemplateInput!) {
  createEmailTemplate(data: $data){
     id
     active
     subject
     createdAt
     updatedAt
  }
}
`;

@Component({
  selector: 'etemplates-index',
  styleUrls: ['etemplates-index.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './etemplates-index.html'
})
export class EmailTemplatesIndexComponent {
  @ViewChild(AppGridDirective) grid: AppGridDirective;
  dtOptions: DataTables.Settings = {};
  sub: Subscription;
  table: any;
  total: number;
  selections = {};
  selected = [];
  entities = [];
  form: FormGroup = new FormGroup({});
  model = {};

  @Select(CoreWidgetState.query) search$: Observable<string>;

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: "subject",
          type: "input",
          className: "col-9",
          defaultValue: "",
          templateOptions: {
            label: "Name",
            placeholder: "",
            required: true
          }
        },
        {
          key: "active",
          type: "checkbox",
          className: "col-3",
          defaultValue: true,
          templateOptions: {
            label: "Active?",
            placeholder: "",
            required: false
          }
        },
      ]
    }
  ];

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  clearSelection() {
    this.selections = {};
    this.selected = [];
  }

  query(evt?: any, filter?: string) {
    if (filter === undefined) {
      filter = this.table.search();
    }

    if (evt) {
      let code = (evt.keyCode ? evt.keyCode : evt.which);
      if (code !== 13) {
        return;
      }
    }

    this.table.search(filter);
    this.table.ajax.reload();
  }

  ngOnInit() {
    const queryRef = this.apollo
      .watchQuery({
        query: QUERY_ENTITY,
        variables: {}
      });


    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload();
      }
    });

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        "<'row'<'col-sm-12 col-md-6'l>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      pageLength: 10,
      order: [2, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
      ajax: (params: any, callback) => {
        let sort = params.order.map(o => {
          return {
            key: this.dtOptions.columns[o.column].data,
            value: o.dir
          }
        });

        const vars = {
          page: {
            sort: sort,
            size: params.length,
            page: 0,
          },
          term: params['search']['value']
        }

        if (this.table) {
          vars.page.page = Math.min(
            Math.max(0, Math.round(params.start / this.table.page.len())),
            this.table.page.info().pages
          )
        }

        queryRef.refetch(vars).then(res => {
          var data: any = {};
          if (res.data) {
            data = res['data']['emailTemplatesConnection'];
            if (!this.total) {
              this.total = data['totalElements']
            }
            this.entities = data.content;
          }

          callback({
            draw: params.draw,
            recordsTotal: this.total,
            recordsFiltered: data['totalElements'],
            error: "",
            data: []
          });
        }, err => {
          callback({
            draw: params.draw,
            recordsTotal: this.total || 0,
            recordsFiltered: 0,
            error: err.message,
            data: []
          });

          this.toastr.warning(`
            <small>${err.message}</small>
          `, 'GraphQL Error', {
              enableHtml: true,
              timeOut: 15000,
              disableTimeOut: true
            })
        });
      },
      columns: [
        { data: null, width: '15px', orderable: false },
        { data: 'subject' },
        { data: 'body', width: '15px'},
        { data: 'updatedAt' },
      ]
    };
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.grid.dtInstance.then(tbl => {
      this.table = tbl;
    });
  }

  createEntity(data: any) { 
    data.body = "";
    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: { data }
    }).subscribe(data => {
      this.total = null;
      this.table.ajax.reload();
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Template Error', {
          enableHtml: true,
          timeOut: 15000
        });
    })
  }


  select(row?: any) {
    if (row) {
      if (this.selections[row.id]) {
        delete this.selections[row.id];
      } else {
        this.selections[row.id] = row;
      }
    }

    this.selected = [];
    for (let k in this.selections) {
      this.selected.push(this.selections[k]);
    }
  }
}