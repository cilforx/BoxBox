namespace BoxBox.Models
{
    public class DrugExpiryItem
    {
        public string DrugKey    { get; set; } = "";
        public string DrugName   { get; set; } = "";
        public string LotNo      { get; set; } = "";
        public string ExpireDate { get; set; } = "";
        public string BoxId      { get; set; } = "";
        public string WardName   { get; set; } = "";
        public int    Quantity   { get; set; }
        public int    RemainDays { get; set; }
        public string AlertLevel { get; set; } = "";
    }

    public class NotifyRequest
    {
        public DrugExpiryItem[] Items        { get; set; } = [];
        public string           Mode         { get; set; } = "";
        public string           ChannelToken { get; set; } = "";
        public string           TargetId     { get; set; } = "";
        public bool             Force        { get; set; }
    }

    public class NotifyResult
    {
        public string Id          { get; set; } = "";
        public string DrugKey     { get; set; } = "";
        public string DrugName    { get; set; } = "";
        public string LotNo       { get; set; } = "";
        public string ExpireDate  { get; set; } = "";
        public string BoxId       { get; set; } = "";
        public string WardName    { get; set; } = "";
        public int    RemainDays  { get; set; }
        public string SentAt      { get; set; } = "";
        public bool   AppShown    { get; set; }
        public bool   LineSent    { get; set; }
        public string LineStatus  { get; set; } = "";
        public bool   Skipped     { get; set; }
        public string SkipReason  { get; set; } = "";
        public string AlertLevel  { get; set; } = "";
    }
}
