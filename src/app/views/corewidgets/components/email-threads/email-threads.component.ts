import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
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
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_ENTITY = gql`
query findAllThreads($query: String, $pageToken: String, $id: String) {
  emailThreads(filter: {
    maxResults: 5
   	query: $query
    pageToken: $pageToken
    id: $id
  }){
    resultSizeEstimate
    nextPageToken
    threads {
      id
      snippet
      historyId
      messages {
        id
        internalDate
        labelIds
        snippet
        raw
        threadId
        payload {
          body {
            decodedData
          }
          to: headers(keys: ["To"]) {
            name
            value
          }
          subject: headers(keys: ["Subject"]) {
            name
            value
          }
          html: content(mimeType: "text/html") {
            body {
              decodedData
            }
          }
          text: content(mimeType: "text/plain") {
            body {
              decodedData
            }
          }
          parts {
            mimeType
            body {
              decodedData
            }
          }
        }
      }
    }
  }
}
`;

@Component({
  selector: 'email-threads',
  styleUrls: ['email-threads.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './email-threads.html'
})
export class EmailThreadsComponent {
  @ViewChild(AppGridDirective) grid: AppGridDirective;
  dtOptions: DataTables.Settings = {};
  sub: Subscription;
  table: any;
  selections = {};
  filter = {email: "", threadId: ""};
  entities = [];
  form: FormGroup = new FormGroup({});
  model = {};
  selected = {};
  loading: boolean = false;
  pages = {
    nextPageToken: "",
    stack: []
  };

  queryRef = this.apollo
  .watchQuery({
    query: QUERY_ENTITY,
    variables: {}
  });

  @Select(CoreWidgetState.query) search$: Observable<string>;

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  paginate(next: Boolean){
    if(next){
      this.pages.stack.push(this.pages.nextPageToken);
      this.fetchData({pageToken: this.pages.nextPageToken});
    }else {
      var page = this.pages.stack.pop();
      this.fetchData({pageToken: page}); 
    }
    return false;
  }

  @Input()
  set email(value){
    this.filter.email = value;
    this.refresh();
  }

  @Input()
  set thread(value){
    this.filter.threadId = value;
    this.refresh();
  }
 

  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  fetchData(vars = {}){
    this.loading = true;
    vars["query"] = `${this.filter.email} ${vars['query'] || ''}`;
    vars["id"] = this.filter.threadId;
    this.queryRef.refetch(vars).then(res => {
        this.loading = false;
        var data: any = {};
        if (res.data) {
          data = res['data']['emailThreads'];
          this.pages.nextPageToken = data.nextPageToken;
          this.entities = data.threads;
        }
    }, err =>  {
      this.loading = false;
    });
  }


  refresh(){
    this.fetchData();
  }

  ngOnInit() {
    this.sub = this.search$.subscribe(query => {
      this.pages = {
        nextPageToken: "",
        stack: []
      };
      this.fetchData({query: query})
    });
    this.fetchData();
  }


  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
