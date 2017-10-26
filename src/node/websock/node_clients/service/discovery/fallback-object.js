class FallBackObject {

    constructor(url){

        this.url = url;
        this.checked = false;

        this.errorTrials = 0;
        this.lastTimeChecked = 0;
    }

    refreshLastTimeChecked(){
        this.lastTimeChecked = new Date().getTime();
    }

    checkLastTimeChecked(nodeTryReconnectAgain){

        let time = new Date().getTime();

        if ( (time - this.lastTimeChecked) >= ( nodeTryReconnectAgain + this.errorTrials*1000 ))
            return true;

        return false;
    }

}

exports.FallBackObject = FallBackObject;